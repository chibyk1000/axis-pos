import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, desc } from "drizzle-orm";
import { stockEntries } from "@/db/schema/stockEntries";
import type { StockEntry, NewStockEntry } from "@/db/schema/stockEntries";
import { nanoid } from "nanoid";

export type { StockEntry, NewStockEntry };

/* -------------------------------------------------------------------------- */
/*                                QUERY KEYS                                  */
/* -------------------------------------------------------------------------- */

export const stockKeys = {
  all: ["stock"] as const,
  byProduct: (productId: string) =>
    [...stockKeys.all, "product", productId] as const,
  history: () => [...stockKeys.all, "history"] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  QUERIES                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compute current stock level for every product.
 * Returns a map of { [productId]: quantityOnHand }
 * Rules:
 *   type "in"         → add quantity
 *   type "out"        → subtract |quantity|  (quantity may be stored negative)
 *   type "adjustment" → set level to quantity (latest adjustment wins per product)
 */
export function useStockLevels() {
  return useQuery({
    queryKey: stockKeys.all,
    queryFn: async () => {
      const entries = await db.query.stockEntries.findMany({
        orderBy: (s) => s.createdAt, // oldest first
      });

      const levels: Record<string, number> = {};

      for (const entry of entries) {
        const cur = levels[entry.productId] ?? 0;
        if (entry.type === "in") {
          levels[entry.productId] = cur + Math.abs(entry.quantity);
        } else if (entry.type === "out") {
          // quantity is stored as negative for "out" entries; use absolute value
          levels[entry.productId] = cur - Math.abs(entry.quantity);
        } else {
          // adjustment → set absolute level
          levels[entry.productId] = entry.quantity;
        }
      }

      return levels;
    },
  });
}

/** Stock history for a single product, newest first */
export function useProductStockHistory(productId: string) {
  return useQuery({
    queryKey: stockKeys.byProduct(productId),
    enabled: !!productId,
    queryFn: () =>
      db.query.stockEntries.findMany({
        where: eq(stockEntries.productId, productId),
        orderBy: (s) => desc(s.createdAt),
      }),
  });
}

/** All stock history entries across every product */
export function useAllStockHistory() {
  return useQuery({
    queryKey: stockKeys.history(),
    queryFn: () =>
      db.query.stockEntries.findMany({
        orderBy: (s) => desc(s.createdAt),
        with: { product: true, supplier: true },
      }),
  });
}

/* -------------------------------------------------------------------------- */
/*                                 MUTATIONS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Add a stock entry.
 * `id` is optional — if omitted, a nanoid is generated automatically.
 * Callers may pass a pre-generated id for idempotency (e.g. optimistic UI).
 */
export function useAddStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<NewStockEntry, "id"> & { id?: string }) => {
      const id = data.id ?? nanoid();
      await db.insert(stockEntries).values({ ...data, id });
      return { ...data, id } as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
    },
  });
}

export function useUpdateStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<StockEntry, "id" | "createdAt">>;
    }) => {
      const existing = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.id, id),
      });
      if (!existing) throw new Error("Stock entry not found");
      await db.update(stockEntries).set(data).where(eq(stockEntries.id, id));
      const updated = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.id, id),
      });
      return updated as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
    },
  });
}

export function useDeleteStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.id, id),
      });
      if (!existing) throw new Error("Stock entry not found");
      await db.delete(stockEntries).where(eq(stockEntries.id, id));
      return existing;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
    },
  });
}
