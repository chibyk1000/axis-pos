import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, inArray } from "drizzle-orm";
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
          stockEntries: { orderBy: (s) => s.createdAt },
        },
      }),
  });
}

// Helper: collect all descendant node IDs (depth-first)
async function getAllChildNodeIds(parentId: string): Promise<string[]> {
  const allNodes = await db.query.nodes.findMany();
  const result: string[] = [];
  function collect(id: string) {
    result.push(id);
    allNodes.filter((n) => n.parentId === id).forEach((c) => collect(c.id));
  }
  collect(parentId);
  return result;
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
          stockEntries: { orderBy: (s) => s.createdAt },
        },
      });
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
          stockEntries: { orderBy: (s) => s.createdAt },
        },
      }),
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
