import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, inArray } from "drizzle-orm";
import { products } from "@/db/schema/products";
import type { Product, NewProduct } from "@/db/schema/index";

/* ---------------------------------------------
 * Query keys
 * --------------------------------------------*/
export const productKeys = {
  all: ["products"] as const,
  detail: (id: string) => ["products", id] as const,
};

/* ---------------------------------------------
 * Queries
 * --------------------------------------------*/

// ---- GET ALL ----
export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: async () =>
      db.query.products.findMany({
        with: {
          barcodes: true,
          taxes: {
            with: {
              tax: true,
              
            }
          },
        },
      }),
  });
}

// Helper to get all descendant node IDs
async function getAllChildNodeIds(parentId: string): Promise<string[]> {
  const allNodes = await db.query.nodes.findMany();
  
  const result: string[] = [];

  function collectChildren(id: string) {
    result.push(id);
    const children = allNodes.filter((n) => n.parentId === id);
    children.forEach((c) => collectChildren(c.id));
  }

  collectChildren(parentId);
  return result;
}

// ---- GET BY ID ----
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      // 1️⃣ Get the node and all its children IDs
      const nodeIds = await getAllChildNodeIds(id);

      // 2️⃣ Fetch products for all these node IDs
      const productList = await db.query.products.findMany({
        where: (p) => inArray(p.nodeId, nodeIds),
        with: {
          barcodes: true,
          taxes: {
            with: {
              tax:true
            }
          },
        },
      });

      return productList;
    },
  });
}

/* ---------------------------------------------
 * Mutations
 * --------------------------------------------*/

// ---- CREATE ----
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewProduct) => {
      const res =  db.insert(products).values(data).returning();

    console.log(res);
    

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// ---- UPDATE ----
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Product>;
    }) => {
      const [updated] = await db
        .update(products)
        .set(data)
        .where(eq(products.id, id))
        .returning();

      if (!updated) {
        throw new Error("Product not found");
      }

      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(updated.nodeId),
      });
    },
  });
}

// ---- DELETE ----
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
     await db
        .delete(products)
        .where(eq(products.id, id))
        .returning();

    

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
