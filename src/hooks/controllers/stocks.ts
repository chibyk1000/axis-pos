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
 * Since productId is now unique, each product has exactly one stock row.
 * We just read quantity directly — no accumulation needed.
 * Returns a map of { [productId]: quantityOnHand }
 */
export function useStockLevels() {
  return useQuery({
    queryKey: stockKeys.all,
    queryFn: async () => {
      const entries = await db.query.stockEntries.findMany();

      const levels: Record<string, StockEntry> = {};
      for (const entry of entries) {
        levels[entry.productId] = entry;
      }

      return levels;
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function getStockEntryByProduct(productId: string) {
  return db.query.stockEntries.findFirst({
    where: eq(stockEntries.productId, productId),
  });
} 
    

/** Stock entry for a single product */
export function useProductStockHistory(productId: string) {
  return useQuery({
    queryKey: stockKeys.byProduct(productId),
    enabled: !!productId,
    staleTime: 0,
    queryFn: () =>
      db.query.stockEntries.findMany({
        where: eq(stockEntries.productId, productId),
        orderBy: (s) => desc(s.createdAt),
      }),
  });
}

/** All stock entries across every product */
export function useAllStockHistory() {
  return useQuery({
    queryKey: stockKeys.history(),
    staleTime: 0,
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
 * Upsert a stock entry.
 * Because productId is unique, inserting a duplicate productId will update
 * the existing row instead of creating a new one.
 *
 * For "in"  → adds to current quantity
 * For "out" → subtracts from current quantity
 * For "adjustment" → sets quantity directly
 */
export function useAddStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<NewStockEntry, "id"> & { id?: string }) => {
      const id = data.id ?? nanoid();

      // Fetch existing row so we can compute the new quantity
      const existing = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.productId, data.productId),
      });

      let newQuantity: number;
      const currentQty = existing?.quantity ?? 0;

      if (data.type === "in") {
        newQuantity = currentQty + Math.abs(data.quantity);
      } else if (data.type === "out") {
        newQuantity = currentQty - Math.abs(data.quantity);
      } else {
        // adjustment → set directly
        newQuantity = data.quantity;
      }

      await db
        .insert(stockEntries)
        .values({ ...data, id, quantity: newQuantity })
        .onConflictDoUpdate({
          target: stockEntries.productId,
          set: {
            type: data.type,
            quantity: newQuantity, // ← computed, not raw input
            note: data.note,
            supplierId: data.supplierId,
            reorderPoint: data.reorderPoint,
            preferredQuantity: data.preferredQuantity,
            lowStockWarning: data.lowStockWarning,
            lowStockWarningQuantity: data.lowStockWarningQuantity,
            createdAt: data.createdAt,
          },
        });

      const row = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.productId, data.productId),
      });
      return row as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
      // Force immediate refetch to ensure all components get fresh data
      qc.refetchQueries({ queryKey: stockKeys.all });
      qc.refetchQueries({ queryKey: stockKeys.byProduct(row.productId) });
    },
  });
}

export function useUpdateStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      productId,
      type,
      quantity,
      ...data
    }: {
      id?: string;
      productId: string;
      type?: "in" | "out" | "adjustment";
      quantity?: number;
      data?: Partial<Omit<StockEntry, "id" | "createdAt" | "productId" | "quantity" | "type">>;
    } & any) => {
      // Find existing entry by id or productId
      const existing = id 
        ? await db.query.stockEntries.findFirst({ where: eq(stockEntries.id, id) })
        : await db.query.stockEntries.findFirst({ where: eq(stockEntries.productId, productId) });

      if (!existing) throw new Error("Stock entry not found");

      let newPreferredQty = existing.preferredQuantity ?? 0;
      if (type && quantity !== undefined) {
        if (type === "in") newPreferredQty += Math.abs(quantity);
        else if (type === "out") newPreferredQty -= Math.abs(quantity);
        else newPreferredQty = quantity; // adjustment
      }

      const updateData = {
        ...data,
        preferredQuantity: newPreferredQty,
        updatedAt: new Date(),
      };

      await db.update(stockEntries).set(updateData).where(eq(stockEntries.id, existing.id));

      const updated = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.id, existing.id),
      });
      return updated as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
      // Force immediate refetch
      qc.refetchQueries({ queryKey: stockKeys.all });
      qc.refetchQueries({ queryKey: stockKeys.byProduct(row.productId) });
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
      qc.invalidateQueries({ queryKey: stockKeys.history() });
      // Force immediate refetch
      qc.refetchQueries({ queryKey: stockKeys.all });
      qc.refetchQueries({ queryKey: stockKeys.byProduct(row.productId) });
    },
  });
}
