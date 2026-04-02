import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/database";
import { documents, documentItems, customers, nodes } from "@/db/schema";
import { and, gte, lte, eq, sql, desc } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

export const dashboardKeys = {
  all: ["dashboard"] as const,
  monthlySales: (year: number) =>
    [...dashboardKeys.all, "monthlySales", year] as const,
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

/* -------------------------------------------------------------------------- */
/*                          MONTHLY SALES CHART                               */
/* -------------------------------------------------------------------------- */

export type MonthlySalesRow = { month: string; sales: number };

export function useMonthlySales(year: number) {
  return useQuery({
    queryKey: dashboardKeys.monthlySales(year),
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
            eq(documents.status, "posted"),
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
      // documentItems.productId → products.nodeId → nodes.name
      return db
        .select({
          name: nodes.name,
          total: sql<number>`coalesce(sum(${documentItems.total}), 0)`,
        })
        .from(documentItems)
        .innerJoin(documents, eq(documentItems.documentId, documents.id))
        .innerJoin(
          nodes,
          sql`${nodes.id} = (
            SELECT node_id FROM products WHERE id = ${documentItems.productId} LIMIT 1
          )`,
        )
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
