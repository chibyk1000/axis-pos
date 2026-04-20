import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import {
  cashEntries,
  openSales,
  openSaleItems,
  customerBalances,
  creditPayments,
  documents,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  CashEntry,
  NewCashEntry,
  OpenSaleWithItems,
  NewOpenSale,
  NewOpenSaleItem,
  NewCreditPayment,
  CreditPayment,
} from "@/db/schema";

export type { CashEntry, OpenSaleWithItems, CreditPayment };

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                            CASH IN / OUT                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const cashKeys = {
  all: ["cashEntries"] as const,
  byUser: (userId: number | null) => [...cashKeys.all, "user", userId] as const,
};

export function useCashEntries(userId: number | null) {
  return useQuery({
    queryKey: cashKeys.byUser(userId),
    queryFn: () =>
      db.query.cashEntries.findMany({
        where: userId != null ? eq(cashEntries.userId, userId) : undefined,
        orderBy: (c) => desc(c.createdAt),
      }),
  });
}

export function useCreateCashEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewCashEntry) => {
      await db.insert(cashEntries).values(data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKeys.all }),
  });
}

export function useDeleteCashEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(cashEntries).where(eq(cashEntries.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKeys.all }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                              OPEN SALES                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const openSaleKeys = {
  all: ["openSales"] as const,
  list: () => [...openSaleKeys.all, "list"] as const,
  byId: (id: string) => [...openSaleKeys.all, "byId", id] as const,
};

export function useOpenSales() {
  return useQuery({
    queryKey: openSaleKeys.list(),
    queryFn: () =>
      db.query.openSales.findMany({
        orderBy: (s) => desc(s.createdAt),
        with: { items: true },
      }) as Promise<OpenSaleWithItems[]>,
  });
}

export function useOpenSaleById(id: string) {
  return useQuery({
    queryKey: openSaleKeys.byId(id),
    enabled: !!id,
    queryFn: async () => {
      const sale = await db.query.openSales.findFirst({
        where: eq(openSales.id, id),
        with: { items: true },
      });
      if (!sale) throw new Error("Open sale not found");
      return sale as OpenSaleWithItems;
    },
  });
}

export function useCreateOpenSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sale,
      items,
    }: {
      sale: NewOpenSale;
      items: NewOpenSaleItem[];
    }) => {
      await db.insert(openSales).values(sale);
      if (items.length) {
        await db
          .insert(openSaleItems)
          .values(items.map((i) => ({ ...i, openSaleId: sale.id })));
      }
      return sale;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: openSaleKeys.list() }),
  });
}

export function useDeleteOpenSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // cascade removes items
      await db.delete(openSales).where(eq(openSales.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: openSaleKeys.list() }),
  });
}

/** Total amount across all open sales */
export function useOpenSalesTotal() {
  return useQuery({
    queryKey: [...openSaleKeys.all, "total"],
    queryFn: async () => {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${openSales.total}), 0)` })
        .from(openSales);
      return row?.total ?? 0;
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                          CREDIT PAYMENTS                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const creditKeys = {
  all: ["creditPayments"] as const,
  byCustomer: (customerId: string) =>
    [...creditKeys.all, "customer", customerId] as const,
  balance: (customerId: string) =>
    [...creditKeys.all, "balance", customerId] as const,
  unpaidDocs: (customerId: string) =>
    [...creditKeys.all, "unpaidDocs", customerId] as const,
};

/** Running balance for a customer (positive = credit, negative = owes) */
export function useCustomerBalance(customerId: string) {
  return useQuery({
    queryKey: creditKeys.balance(customerId),
    enabled: !!customerId,
    queryFn: async () => {
      const row = await db.query.customerBalances.findFirst({
        where: eq(customerBalances.customerId, customerId),
      });
      return row?.balance ?? 0;
    },
  });
}

/** Unpaid posted documents for a customer */
export function useUnpaidDocuments(customerId: string) {
  return useQuery({
    queryKey: creditKeys.unpaidDocs(customerId),
    enabled: !!customerId,
    queryFn: () =>
      db.query.documents.findMany({
        where: and(
          eq(documents.customerId, customerId),
          eq(documents.status, "posted"),
          eq(documents.paid, false),
        ),
        orderBy: (d) => desc(d.date),
      }),
  });
}

/** All credit payments for a customer */
export function useCreditPaymentHistory(customerId: string) {
  return useQuery({
    queryKey: creditKeys.byCustomer(customerId),
    enabled: !!customerId,
    queryFn: () =>
      db.query.creditPayments.findMany({
        where: eq(creditPayments.customerId, customerId),
        orderBy: (p) => desc(p.createdAt),
      }) as Promise<CreditPayment[]>,
  });
}

/**
 * Record a credit payment:
 *  1. Insert creditPayments row
 *  2. Upsert customerBalances (add amount to balance)
 */
export function useRecordCreditPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewCreditPayment) => {
      // 1. Insert payment record
      await db.insert(creditPayments).values(data);
      const payment = data;

      // 2. Upsert balance
      const existing = await db.query.customerBalances.findFirst({
        where: eq(customerBalances.customerId, data.customerId),
      });

      if (existing) {
        await db
          .update(customerBalances)
          .set({ balance: existing.balance + data.amount })
          .where(eq(customerBalances.customerId, data.customerId));
      } else {
        await db.insert(customerBalances).values({
          id: nanoid(),
          customerId: data.customerId,
          balance: data.amount,
        });
      }

      return payment;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: creditKeys.balance(vars.customerId) });
      qc.invalidateQueries({
        queryKey: creditKeys.byCustomer(vars.customerId),
      });
      qc.invalidateQueries({
        queryKey: creditKeys.unpaidDocs(vars.customerId),
      });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                            END OF DAY                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const eodKeys = {
  all: ["endOfDay"] as const,
  summary: () => [...eodKeys.all, "summary"] as const,
};

export type EodSummary = {
  totalSales: number;
  totalDocuments: number;
  totalTax: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
};

/** Today's sales summary for the EOD report */
export function useEodSummary() {
  return useQuery({
    queryKey: eodKeys.summary(),
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

      const [salesRow] = await db
        .select({
          totalSales: sql<number>`coalesce(sum(${documents.total}), 0)`,
          totalDocuments: sql<number>`count(${documents.id})`,
          totalTax: sql<number>`coalesce(sum(${documents.taxTotal}), 0)`,
        })
        .from(documents)
        .where(
          and(
            eq(documents.status, "posted"),
            sql`${documents.date} >= ${startOfDay} AND ${documents.date} <= ${endOfDay}`,
          ),
        );

      const cashRows = await db.query.cashEntries.findMany({
        where: sql`${cashEntries.createdAt} >= ${startOfDay} AND ${cashEntries.createdAt} <= ${endOfDay}`,
      });

      const cashIn = cashRows
        .filter((r) => r.type === "in")
        .reduce((s, r) => s + r.amount, 0);
      const cashOut = cashRows
        .filter((r) => r.type === "out")
        .reduce((s, r) => s + r.amount, 0);

      return {
        totalSales: salesRow?.totalSales ?? 0,
        totalDocuments: salesRow?.totalDocuments ?? 0,
        totalTax: salesRow?.totalTax ?? 0,
        cashIn,
        cashOut,
        netCash: cashIn - cashOut,
      } satisfies EodSummary;
    },
  });
}
