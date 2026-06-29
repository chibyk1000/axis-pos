import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, desc } from "drizzle-orm";
import { stockEntries } from "@/db/schema/stockEntries";
import type { StockEntry, NewStockEntry } from "@/db/schema/stockEntries";
import { stockLogs } from "@/db/schema/stockLogs";
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
  logs: () => [...stockKeys.all, "logs"] as const,
  productLogs: (productId: string) =>
    [...stockKeys.all, "logs", productId] as const,
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
    // PERF: this used to be staleTime: 0 + refetchOnWindowFocus/refetchOnMount,
    // meaning it re-pulled the *entire* stock_entries table every single time
    // the app window regained focus or this hook remounted (e.g. navigating
    // away from POS and back). Every mutation in this file already calls
    // invalidateQueries + refetchQueries on this exact key, so the data stays
    // fresh after any actual stock change without needing to force a refetch
    // on every focus/mount too.
    staleTime: 30_000,
    gcTime: 1000 * 60 * 5,
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
    staleTime: 30_000,
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
    staleTime: 30_000,
    queryFn: () =>
      db.query.stockEntries.findMany({
        orderBy: (s) => desc(s.createdAt),
        with: { product: true, supplier: true },
      }),
  });
}

export function useStockLogs() {
  return useQuery({
    queryKey: stockKeys.logs(),
    staleTime: 30_000,
    queryFn: () =>
      db.query.stockLogs.findMany({
        orderBy: (s) => desc(s.createdAt),
        with: { product: true },
      }),
  });
}

export function useProductStockLogs(productId: string) {
  return useQuery({
    queryKey: stockKeys.productLogs(productId),
    enabled: !!productId,
    staleTime: 30_000,
    queryFn: () =>
      db.query.stockLogs.findMany({
        where: eq(stockLogs.productId, productId),
        orderBy: (s) => desc(s.createdAt),
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

      // Insert log entry
      if (data.type && data.quantity !== undefined) {
        await db.insert(stockLogs).values({
          id: nanoid(),
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          note: data.note,
        });
      }

      const row = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.productId, data.productId),
      });
      return row as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
      qc.invalidateQueries({ queryKey: stockKeys.logs() });
      qc.invalidateQueries({ queryKey: stockKeys.productLogs(row.productId) });
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
      data?: Partial<
        Omit<StockEntry, "id" | "createdAt" | "productId" | "quantity" | "type">
      >;
    } & any) => {
      // Find existing entry by id or productId
      const existing = id
        ? await db.query.stockEntries.findFirst({
            where: eq(stockEntries.id, id),
          })
        : await db.query.stockEntries.findFirst({
            where: eq(stockEntries.productId, productId),
          });

      if (!existing) throw new Error("Stock entry not found");

      let newQuantity = existing.quantity ?? 0;
      if (type && quantity !== undefined) {
        if (type === "in") newQuantity += Math.abs(quantity);
        else if (type === "out") newQuantity -= Math.abs(quantity);
        else newQuantity = quantity; // adjustment
      }

      const updateData = {
        ...data,
        quantity: newQuantity,
        type: type ?? existing.type,
        updatedAt: new Date(),
      };

      await db
        .update(stockEntries)
        .set(updateData)
        .where(eq(stockEntries.id, existing.id));

      if (type && quantity !== undefined) {
        await db.insert(stockLogs).values({
          id: nanoid(),
          productId: existing.productId,
          type: type,
          quantity: quantity,
          note: data?.note,
        });
      }

      const updated = await db.query.stockEntries.findFirst({
        where: eq(stockEntries.id, existing.id),
      });
      return updated as StockEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: stockKeys.all });
      qc.invalidateQueries({ queryKey: stockKeys.byProduct(row.productId) });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
      qc.invalidateQueries({ queryKey: stockKeys.logs() });
      qc.invalidateQueries({ queryKey: stockKeys.productLogs(row.productId) });
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

/**
 * Create a detailed stock log entry when a purchase is made
 * Tracks what changed during the transaction
 */
export function useAddStockLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      documentId?: string;
      type: "in" | "out" | "adjustment";
      quantity: number;
      note?: string;
      transactionDetails?: {
        productTitle?: string;
        customerName?: string;
        customerId?: string;
        documentNumber?: string;
        unitPrice?: number;
        totalValue?: number;
        discount?: number;
        priceLabel?: string;
        reason?: string;
        productId?: string;
        stockLevelBefore?: number;
        stockLevelAfter?: number;
        stockChange?: number;
        paymentMethods?: Array<{ paymentId: string; paymentType: string; amount: number }>;
        totalPaymentAmount?: number;
        paymentDate?: string;
        taxRate?: number;
        taxAmount?: number;
        transactionType?: string;
        quantitySold?: number;
        isContinuedPayment?: boolean;
      };
    }) => {
      // Build comprehensive note with transaction details
      let fullNote = data.note || "";
      if (data.transactionDetails) {
        const details = data.transactionDetails;
        const noteParts = [];

        if (details.reason) noteParts.push(`Reason: ${details.reason}`);
        if (details.documentNumber)
          noteParts.push(`Doc: ${details.documentNumber}`);
        if (details.customerName)
          noteParts.push(`Customer: ${details.customerName}`);
        if (details.productTitle)
          noteParts.push(`Product: ${details.productTitle}`);
        if (details.priceLabel)
          noteParts.push(`Price Label: ${details.priceLabel}`);
        if (details.unitPrice !== undefined)
          noteParts.push(`Unit Price: ${details.unitPrice.toFixed(2)}`);
        if (details.totalValue !== undefined)
          noteParts.push(`Total: ${details.totalValue.toFixed(2)}`);
        if (details.discount !== undefined && details.discount > 0)
          noteParts.push(`Discount: ${details.discount.toFixed(2)}`);

        if (noteParts.length > 0) {
          fullNote = noteParts.join(" | ");
        }
      }

      const logEntry = await db.insert(stockLogs).values({
        id: nanoid(),
        productId: data.productId,
        documentId: data.documentId || null,
        type: data.type,
        quantity: data.quantity,
        note: fullNote,
      });

      return logEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockKeys.logs() });
      qc.invalidateQueries({ queryKey: stockKeys.history() });
    },
  });
}
