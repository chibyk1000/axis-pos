import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { and, eq, inArray, like, or, count } from "drizzle-orm";
import { products } from "@/db/schema/products";
import { productPrices } from "@/db/schema/index";
import type { Product, NewProduct } from "@/db/schema/products";

export { type Product, type NewProduct };

/* -------------------------------------------------------------------------- */
/*                                QUERY KEYS                                  */
/* -------------------------------------------------------------------------- */

export const productKeys = {
  all: ["products"] as const,
  detail: (id: string) => ["products", id] as const,
  page: (page: number, pageSize: number, search: string) =>
    ["products", "page", page, pageSize, search] as const,
  count: (search: string) => ["products", "count", search] as const,
  byNodePage: (nodeId: string, page: number, pageSize: number, search: string) =>
    ["products", "node-page", nodeId, page, pageSize, search] as const,
  byNodeCount: (nodeId: string, search: string) =>
    ["products", "node-count", nodeId, search] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  QUERIES                                   */
/* -------------------------------------------------------------------------- */

export function useFlatProductsWithPrices() {
  return useQuery({
    queryKey: ["products", "flat-list"],
    queryFn: async () => {
      const rows = await db
        .select({
          // Product Fields
          id: products.id,
          title: products.title,
          code: products.code,
          unit: products.unit,
          image: products.image,
          active: products.active,

          // Price Fields (Flattened)
          priceId: productPrices.id,
          cost: productPrices.cost,
          markup: productPrices.markup,
          salePrice: productPrices.salePrice,
          wholeSale: productPrices.wholeSale,
          isDefault: productPrices.isDefault,
          priceAfterTax: productPrices.priceAfterTax,
          priceChangeAllowed: productPrices.priceChangeAllowed,
        })
        .from(products)
        // Left join ensures products show up even if they don't have a price yet
        .leftJoin(productPrices, eq(products.id, productPrices.productId));

      return rows;
    },
  });
}
export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: () =>
      db.query.products.findMany({
        with: {
          barcodes: true,
          taxes: { with: { tax: true } },
          prices: true,
          stockEntries: { orderBy: (s) => s.createdAt },
          supplier: true,
        },
      }),
  });
}

/** DB-level paginated product list (search by title or code). */
export function useProductsPage(
  page: number,
  pageSize: number,
  search: string = "",
) {
  return useQuery({
    queryKey: productKeys.page(page, pageSize, search),
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const base = db.query.products;
      const rows = await base.findMany({
        where: search.trim()
          ? (p, { or, like }) =>
              or(
                like(p.title, `%${search.trim()}%`),
                like(p.code, `%${search.trim()}%`),
              )
          : undefined,
        limit: pageSize,
        offset,
        with: {
          barcodes: true,
          taxes: { with: { tax: true } },
          prices: true,
          stockEntries: { orderBy: (s) => s.createdAt },
          supplier: true,
        },
      });
      return rows;
    },
    placeholderData: (prev) => prev,
  });
}

/** Total count for pagination. */
export function useProductsCount(search: string = "") {
  return useQuery({
    queryKey: productKeys.count(search),
    queryFn: async () => {
      const [row] = await db
        .select({ total: count(products.id) })
        .from(products)
        .where(
          search.trim()
            ? or(
                like(products.title, `%${search.trim()}%`),
                like(products.code, `%${search.trim()}%`),
              )
            : undefined,
        );
      return row?.total ?? 0;
    },
  });
}

// PERF: this used to re-fetch the ENTIRE `nodes` table and re-walk the tree
// from scratch every time it was called — and it was being called separately
// by useProductsByNodePage, useProductsByNodeCount, AND useProduct, so a
// single category page load could trigger 2-3 full table scans + JS tree
// walks. We now memoize the underlying nodes fetch + per-parent result via
// React Query's cache, so the nodes table is only re-read once (until a node
// mutation invalidates ["nodes", "all"]) and repeat lookups for the same
// parentId are free.
const childNodeIdsCache = new Map<string, Promise<string[]>>();

async function getAllChildNodeIds(parentId: string): Promise<string[]> {
  const cached = childNodeIdsCache.get(parentId);
  if (cached) return cached;

  const promise = (async () => {
    const allNodes = await db.query.nodes.findMany();
    const result: string[] = [];
    const visited = new Set<string>();

    function collect(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      result.push(id);
      allNodes.filter((n) => n.parentId === id).forEach((c) => collect(c.id));
    }
    collect(parentId);
    return result;
  })();

  childNodeIdsCache.set(parentId, promise);
  // Don't let a transient failure poison the cache forever.
  promise.catch(() => childNodeIdsCache.delete(parentId));
  return promise;
}

// Call this from anywhere nodes are created/moved/deleted so stale
// descendant-id lists don't leak into product queries after the tree changes.
export function invalidateChildNodeIdsCache() {
  childNodeIdsCache.clear();
}

export function useProduct(nodeId: string) {
  return useQuery({
    queryKey: productKeys.detail(nodeId),
    enabled: !!nodeId,
    queryFn: async () => {
      const nodeIds = await getAllChildNodeIds(nodeId);
      return db.query.products.findMany({
        where: (p) => inArray(p.nodeId, nodeIds),
        with: {
          barcodes: true,
          taxes: { with: { tax: true } },
          prices: true,
          stockEntries: { orderBy: (s) => s.createdAt },
          supplier: true,
        },
      });
    },
  });
}

export function useProductsByNodePage(
  nodeId: string,
  page: number,
  pageSize: number,
  search: string = "",
) {
  return useQuery({
    queryKey: productKeys.byNodePage(nodeId, page, pageSize, search),
    enabled: !!nodeId,
    queryFn: async () => {
      const nodeIds = await getAllChildNodeIds(nodeId);
      const clauses = [
        inArray(products.nodeId, nodeIds),
        search.trim()
          ? or(
              like(products.title, `%${search.trim()}%`),
              like(products.code, `%${search.trim()}%`),
            )
          : undefined,
      ].filter(Boolean);

      return db.query.products.findMany({
        where: and(...clauses),
        limit: pageSize,
        offset: (page - 1) * pageSize,
        with: {
          barcodes: true,
          taxes: { with: { tax: true } },
          prices: true,
          stockEntries: { orderBy: (s) => s.createdAt },
          supplier: true,
        },
      });
    },
    placeholderData: (prev) => prev,
  });
}

export function useProductsByNodeCount(nodeId: string, search: string = "") {
  return useQuery({
    queryKey: productKeys.byNodeCount(nodeId, search),
    enabled: !!nodeId,
    queryFn: async () => {
      const nodeIds = await getAllChildNodeIds(nodeId);
      const clauses = [
        inArray(products.nodeId, nodeIds),
        search.trim()
          ? or(
              like(products.title, `%${search.trim()}%`),
              like(products.code, `%${search.trim()}%`),
            )
          : undefined,
      ].filter(Boolean);

      const [row] = await db
        .select({ total: count(products.id) })
        .from(products)
        .where(and(...clauses));
      return row?.total ?? 0;
    },
  });
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: () =>
      db.query.products.findFirst({
        where: eq(products.id, id),
        with: {
          barcodes: true,
          taxes: { with: { tax: true } },
          prices: true,
          stockEntries: { orderBy: (s) => s.createdAt },
          supplier: true,
        },
      }),
  });
}

export function useNextProductCode() {
  return useQuery({
    queryKey: ["products", "next-code"],
    queryFn: async () => {
      const allProducts = await db
        .select({ code: products.code })
        .from(products);
      if (allProducts.length === 0) return "1";

      const codes = allProducts
        .map((p) => parseInt(p.code, 10))
        .filter((n) => !isNaN(n));

      if (codes.length === 0) return "1";

      const maxCode = Math.max(...codes);
      return (maxCode + 1).toString();
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                 MUTATIONS                                  */
/* -------------------------------------------------------------------------- */

// Only the columns that still exist on the products table
type CreateProductInput = Pick<
  NewProduct,
  | "id"
  | "nodeId"
  | "supplierId"
  | "title"
  | "code"
  | "unit"
  | "active"
  | "service"
  | "defaultQuantity"
  | "ageRestriction"
  | "description"
  | "image"
  | "color"
>;

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      await db.insert(products).values({
        id: data.id,
        nodeId: data.nodeId,
        supplierId: data.supplierId ?? null,
        title: data.title,
        code: data.code,
        unit: data.unit,
        active: data.active ?? false,
        service: data.service ?? false,
        defaultQuantity: data.defaultQuantity ?? false,
        ageRestriction: data.ageRestriction ?? null,
        description: data.description ?? null,
        image: data.image ?? null,
        color: data.color ?? null,
      });
      return data as NewProduct;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateProductInput>;
    }) => {
      await db.update(products).set(data).where(eq(products.id, id));
      const updated = await db.query.products.findFirst({
        where: eq(products.id, id),
      });
      if (!updated) throw new Error("Product not found");
      return updated;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(updated.nodeId) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(products).where(eq(products.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
