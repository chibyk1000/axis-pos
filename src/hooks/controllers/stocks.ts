import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { stockEntries } from "@/db/schema/stockEntries";
import { eq, desc, sql } from "drizzle-orm";
import type { NewStockEntry } from "@/db/schema/stockEntries";

export const stockKeys = {
  all: ["stock"] as const,
  byProduct: (productId: string) => ["stock", "product", productId] as const,
  levels: ["stock", "levels"] as const,
};

/** Current stock level per product — sum of all entries */
export function useStockLevels() {
  return useQuery({
    queryKey: stockKeys.levels,
    queryFn: async () => {
      const rows = await db
        .select({
          productId: stockEntries.productId,
          total: sql<number>`sum(${stockEntries.quantity})`,
        })
        .from(stockEntries)
        .groupBy(stockEntries.productId);

      // Return as a map: productId -> quantity
      return Object.fromEntries(rows.map((r) => [r.productId, r.total ?? 0]));
    },
  });
}

/** Full history for a single product */
export function useProductStockHistory(productId: string) {
  return useQuery({
    queryKey: stockKeys.byProduct(productId),
    enabled: !!productId,
    queryFn: async () =>
      db
        .select()
        .from(stockEntries)
        .where(eq(stockEntries.productId, productId))
        .orderBy(desc(stockEntries.createdAt)),
  });
}

/** All stock entries with product info */
export function useAllStockHistory() {
  return useQuery({
    queryKey: stockKeys.all,
    queryFn: async () =>
      db.query.stockEntries.findMany({
        orderBy: (s) => desc(s.createdAt),
        with: { product: true },
      }),
  });
}

/** Add a stock entry (quick inventory) */
export function useAddStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<NewStockEntry, "id">) => {
      const [created] = await db
        .insert(stockEntries)
        .values({ ...data, id: crypto.randomUUID() })
        .returning();
      return created;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.levels });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}
