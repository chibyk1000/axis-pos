import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/database";
import {
  documents,
  documentItems,
  documentPayments,
  customers,
  nodes,
  products,
} from "@/db/schema";
import { and, gte, lte, eq, sql, desc } from "drizzle-orm";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  endOfWeek,
  format,
  differenceInCalendarDays,
} from "date-fns";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

export const dashboardKeys = {
  all: ["dashboard"] as const,
  monthlySales: (year: number, includeAll: boolean) =>
    [...dashboardKeys.all, "monthlySales", year, includeAll] as const,
  weeklySales: (weeksBack: number, includeAll: boolean) =>
    [...dashboardKeys.all, "weeklySales", weeksBack, includeAll] as const,
  salesByRange: (from: Date, to: Date, includeAll: boolean) =>
    [
      ...dashboardKeys.all,
      "salesByRange",
      from.toISOString(),
      to.toISOString(),
      includeAll,
    ] as const,
  topProducts: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "topProducts",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  hourlySales: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "hourlySales",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  topProductGroups: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "topProductGroups",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  totalSales: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "totalSales",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  topCustomers: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "topCustomers",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  orderCount: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "orderCount",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  refunds: (from: Date, to: Date) =>
    [...dashboardKeys.all, "refunds", from.toISOString(), to.toISOString()] as const,
  outstandingBalance: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "outstandingBalance",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  newCustomers: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "newCustomers",
      from.toISOString(),
      to.toISOString(),
    ] as const,
  paymentMethods: (from: Date, to: Date) =>
    [
      ...dashboardKeys.all,
      "paymentMethods",
      from.toISOString(),
      to.toISOString(),
    ] as const,
};

/* -------------------------------------------------------------------------- */
/*                           DATE RANGE HELPER                                */
/* -------------------------------------------------------------------------- */

function dateRange(from: Date, to: Date) {
  // documents.date is stored as a unix timestamp integer
  return and(
    gte(documents.date, from),
    lte(documents.date, to),
    eq(documents.status, "posted"),
  );
}

/** Same as `dateRange` but lets the caller include drafts/cancelled docs too
 * (the "All docs" toggle in the sales chart). */
function dateRangeWithStatus(from: Date, to: Date, includeAll: boolean) {
  return and(
    gte(documents.date, from),
    lte(documents.date, to),
    includeAll ? undefined : eq(documents.status, "posted"),
  );
}

/* -------------------------------------------------------------------------- */
/*                          MONTHLY SALES CHART                               */
/* -------------------------------------------------------------------------- */

export type MonthlySalesRow = { month: string; sales: number };

export function useMonthlySales(year: number, includeAll = false) {
  return useQuery({
    queryKey: dashboardKeys.monthlySales(year, includeAll),
    queryFn: async (): Promise<MonthlySalesRow[]> => {
      // SQLite: strftime('%m', datetime(date, 'unixepoch')) → '01'..'12'
      const rows = await db
        .select({
          month: sql<string>`strftime('%m', datetime(${documents.date}, 'unixepoch'))`,
          sales: sql<number>`coalesce(sum(${documents.total}), 0)`,
        })
        .from(documents)
        .where(
          and(
            sql`strftime('%Y', datetime(${documents.date}, 'unixepoch')) = ${String(year)}`,
            includeAll ? undefined : eq(documents.status, "posted"),
          ),
        )
        .groupBy(sql`strftime('%m', datetime(${documents.date}, 'unixepoch'))`)
        .orderBy(sql`strftime('%m', datetime(${documents.date}, 'unixepoch'))`);

      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Fill all 12 months, default 0 for months with no sales
      return MONTHS.map((label, idx) => {
        const mm = String(idx + 1).padStart(2, "0");
        const row = rows.find((r) => r.month === mm);
        return { month: label, sales: row?.sales ?? 0 };
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                    WEEKLY / CUSTOM-RANGE SALES TREND                       */
/* -------------------------------------------------------------------------- */

export type SalesTrendRow = { label: string; sales: number };

/** Raw (date, total) rows in a window — bucketed client-side so we don't
 * have to fight SQLite's `strftime('%W', ...)` week-numbering semantics
 * (Monday/Sunday start, year-boundary edge cases) to match date-fns. */
async function fetchDocTotalsInRange(from: Date, to: Date, includeAll: boolean) {
  return db
    .select({ date: documents.date, total: documents.total })
    .from(documents)
    .where(dateRangeWithStatus(from, to, includeAll));
}

/** Last `weeksBack` weeks (Mon–Sun), most recent week ending today. */
export function useWeeklySales(weeksBack = 12, includeAll = false) {
  return useQuery({
    queryKey: dashboardKeys.weeklySales(weeksBack, includeAll),
    queryFn: async (): Promise<SalesTrendRow[]> => {
      const now = new Date();
      const rangeStart = startOfWeek(subWeeks(now, weeksBack - 1), {
        weekStartsOn: 1,
      });
      const rangeEnd = endOfWeek(now, { weekStartsOn: 1 });

      const docs = await fetchDocTotalsInRange(rangeStart, rangeEnd, includeAll);

      const buckets = Array.from({ length: weeksBack }, (_, i) => {
        const start = addWeeks(rangeStart, i);
        return { start, label: format(start, "MMM d"), sales: 0 };
      });

      docs.forEach((d) => {
        const key = startOfWeek(d.date, { weekStartsOn: 1 }).getTime();
        const bucket = buckets.find((b) => b.start.getTime() === key);
        if (bucket) bucket.sales += d.total ?? 0;
      });

      return buckets.map((b) => ({ label: b.label, sales: b.sales }));
    },
  });
}

/** Adaptive bucketing for an arbitrary custom range — day/week/month
 * depending on span, so the chart never renders 1 bar or 1000 bars. */
export function useSalesByRange(from: Date, to: Date, includeAll = false) {
  return useQuery({
    queryKey: dashboardKeys.salesByRange(from, to, includeAll),
    queryFn: async (): Promise<SalesTrendRow[]> => {
      const docs = await fetchDocTotalsInRange(from, to, includeAll);
      const spanDays = differenceInCalendarDays(to, from) + 1;

      const bucketBy: "day" | "week" | "month" =
        spanDays <= 62 ? "day" : spanDays <= 400 ? "week" : "month";

      const bucketStart = (d: Date) =>
        bucketBy === "day"
          ? startOfDay(d)
          : bucketBy === "week"
            ? startOfWeek(d, { weekStartsOn: 1 })
            : startOfMonth(d);
      const bucketLabel = (d: Date) =>
        bucketBy === "month" ? format(d, "MMM yyyy") : format(d, "MMM d");
      const nextBucketStart = (d: Date) =>
        bucketBy === "day" ? addDays(d, 1) : bucketBy === "week" ? addWeeks(d, 1) : addMonths(d, 1);

      const buckets: { start: Date; label: string; sales: number }[] = [];
      let cursor = bucketStart(from);
      const end = bucketStart(to);
      // Safety cap so a mis-set range can't spin the browser forever.
      let guard = 0;
      while (cursor <= end && guard < 1000) {
        buckets.push({ start: cursor, label: bucketLabel(cursor), sales: 0 });
        cursor = nextBucketStart(cursor);
        guard++;
      }

      docs.forEach((d) => {
        const key = bucketStart(d.date).getTime();
        const bucket = buckets.find((b) => b.start.getTime() === key);
        if (bucket) bucket.sales += d.total ?? 0;
      });

      return buckets.map((b) => ({ label: b.label, sales: b.sales }));
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                            TOP PRODUCTS                                    */
/* -------------------------------------------------------------------------- */

export type TopProductRow = { name: string; total: number; quantity: number };

export function useTopProducts(from: Date, to: Date, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.topProducts(from, to),
    queryFn: async (): Promise<TopProductRow[]> => {
      return db
        .select({
          name: documentItems.name,
          total: sql<number>`coalesce(sum(${documentItems.total}), 0)`,
          quantity: sql<number>`coalesce(sum(${documentItems.quantity}), 0)`,
        })
        .from(documentItems)
        .innerJoin(documents, eq(documentItems.documentId, documents.id))
        .where(dateRange(from, to))
        .groupBy(documentItems.name)
        .orderBy(desc(sql`sum(${documentItems.total})`))
        .limit(limit);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                            HOURLY SALES                                    */
/* -------------------------------------------------------------------------- */

export type HourlySalesRow = { hour: string; sales: number };

export function useHourlySales(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.hourlySales(from, to),
    queryFn: async (): Promise<HourlySalesRow[]> => {
      const rows = await db
        .select({
          hour: sql<string>`strftime('%H', datetime(${documents.date}, 'unixepoch'))`,
          sales: sql<number>`coalesce(sum(${documents.total}), 0)`,
        })
        .from(documents)
        .where(dateRange(from, to))
        .groupBy(sql`strftime('%H', datetime(${documents.date}, 'unixepoch'))`)
        .orderBy(sql`strftime('%H', datetime(${documents.date}, 'unixepoch'))`);

      // Return all 24 hours with 0 fill
      return Array.from({ length: 24 }, (_, h) => {
        const hh = String(h).padStart(2, "0");
        const row = rows.find((r) => r.hour === hh);
        return { hour: `${hh}:00`, sales: row?.sales ?? 0 };
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                         TOP PRODUCT GROUPS                                 */
/* -------------------------------------------------------------------------- */

export type TopGroupRow = { name: string; total: number };

export function useTopProductGroups(from: Date, to: Date, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.topProductGroups(from, to),
    queryFn: async (): Promise<TopGroupRow[]> => {
      // PERF: previously joined via a correlated scalar subquery
      // `(SELECT node_id FROM products WHERE id = documentItems.productId LIMIT 1)`
      // which SQLite has to re-execute once per document_items row. A plain
      // join lets it use the index on products.id (PK) / document_items.productId
      // and do a single pass instead.
      return db
        .select({
          name: nodes.name,
          total: sql<number>`coalesce(sum(${documentItems.total}), 0)`,
        })
        .from(documentItems)
        .innerJoin(documents, eq(documentItems.documentId, documents.id))
        .innerJoin(products, eq(products.id, documentItems.productId))
        .innerJoin(nodes, eq(nodes.id, products.nodeId))
        .where(dateRange(from, to))
        .groupBy(nodes.name)
        .orderBy(desc(sql`sum(${documentItems.total})`))
        .limit(limit);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                            TOTAL SALES                                     */
/* -------------------------------------------------------------------------- */

export function useTotalSales(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.totalSales(from, to),
    queryFn: async (): Promise<number> => {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${documents.total}), 0)` })
        .from(documents)
        .where(dateRange(from, to));
      return row?.total ?? 0;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                           TOP CUSTOMERS                                    */
/* -------------------------------------------------------------------------- */

export type TopCustomerRow = { name: string; total: number; count: number };

export function useTopCustomers(from: Date, to: Date, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.topCustomers(from, to),
    queryFn: async (): Promise<TopCustomerRow[]> => {
      return db
        .select({
          name: customers.name,
          total: sql<number>`coalesce(sum(${documents.total}), 0)`,
          count: sql<number>`count(${documents.id})`,
        })
        .from(documents)
        .innerJoin(customers, eq(documents.customerId, customers.id))
        .where(dateRange(from, to))
        .groupBy(customers.id)
        .orderBy(desc(sql`sum(${documents.total})`))
        .limit(limit);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              ORDER COUNT                                    */
/* -------------------------------------------------------------------------- */

export function useOrderCount(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.orderCount(from, to),
    queryFn: async (): Promise<number> => {
      const [row] = await db
        .select({ count: sql<number>`count(${documents.id})` })
        .from(documents)
        .where(dateRange(from, to));
      return row?.count ?? 0;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                REFUNDS                                      */
/* -------------------------------------------------------------------------- */

export type RefundsSummary = { total: number; count: number };

export function useRefundsSummary(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.refunds(from, to),
    queryFn: async (): Promise<RefundsSummary> => {
      // Refund docs are identified by a "REF-" number prefix, same
      // convention used by the Reporting page's "Refunds" report.
      const rows = await db
        .select({ number: documents.number, total: documents.total })
        .from(documents)
        .where(and(gte(documents.date, from), lte(documents.date, to)));

      const refunds = rows.filter((r) => r.number.startsWith("REF-"));
      return {
        total: refunds.reduce((s, r) => s + (r.total ?? 0), 0),
        count: refunds.length,
      };
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                          OUTSTANDING BALANCE                                */
/* -------------------------------------------------------------------------- */

export function useOutstandingBalance(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.outstandingBalance(from, to),
    queryFn: async (): Promise<number> => {
      const [row] = await db
        .select({
          total: sql<number>`coalesce(sum(${documents.outstandingBalance}), 0)`,
        })
        .from(documents)
        .where(
          and(
            gte(documents.date, from),
            lte(documents.date, to),
            eq(documents.status, "posted"),
            eq(documents.paid, false),
          ),
        );
      return row?.total ?? 0;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                             NEW CUSTOMERS                                  */
/* -------------------------------------------------------------------------- */

export function useNewCustomersCount(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.newCustomers(from, to),
    queryFn: async (): Promise<number> => {
      const [row] = await db
        .select({ count: sql<number>`count(${customers.id})` })
        .from(customers)
        .where(and(gte(customers.createdAt, from), lte(customers.createdAt, to)));
      return row?.count ?? 0;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                         PAYMENT METHOD BREAKDOWN                           */
/* -------------------------------------------------------------------------- */

export type PaymentMethodRow = { paymentType: string; total: number };

export function usePaymentMethodBreakdown(from: Date, to: Date) {
  return useQuery({
    queryKey: dashboardKeys.paymentMethods(from, to),
    queryFn: async (): Promise<PaymentMethodRow[]> => {
      return db
        .select({
          paymentType: sql<string>`coalesce(${documentPayments.paymentType}, 'Unknown')`,
          total: sql<number>`coalesce(sum(${documentPayments.amount}), 0)`,
        })
        .from(documentPayments)
        .innerJoin(documents, eq(documentPayments.documentId, documents.id))
        .where(dateRange(from, to))
        .groupBy(documentPayments.paymentType)
        .orderBy(desc(sql`sum(${documentPayments.amount})`));
    },
  });
}
