import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, gte, lte, and } from "drizzle-orm";
import { documents } from "@/db/schema";

export type ReportType =
  | "Products"
  | "Product groups"
  | "Customers"
  | "Tax rates"
  | "Users"
  | "Item list"
  | "Payment types"
  | "Payment types by users"
  | "Payment types by customers"
  | "Refunds"
  | "Invoice list"
  | "Daily sales"
  | "Hourly sales"
  | "Hourly sales by product groups"
  | "Table or order number"
  | "Profit & margin"
  | "Unpaid sales"
  | "Starting cash entries";

export const reportKeys = {
  all: ["reports"] as const,
  byType: (type: ReportType) => [...reportKeys.all, type] as const,
  filtered: (type: ReportType, filters: any) =>
    [...reportKeys.byType(type), JSON.stringify(filters)] as const,
};

/** Generate report data based on type */
export function useReportData(
  reportType: ReportType,
  filters?: { from?: Date; to?: Date; customerId?: string },
) {
  return useQuery({
    queryKey: reportKeys.filtered(reportType, filters),
    enabled: !!reportType,
    queryFn: async () => {
      switch (reportType) {
        case "Products":
          return await db.query.products.findMany({
            orderBy: (p) => p.title,
            with: { node: true },
          });

        case "Customers":
          return await db.query.customers.findMany({
            orderBy: (c) => c.name,
          });

        case "Tax rates":
          return await db.query.taxes.findMany({
            orderBy: (t) => t.name,
          });

        case "Users":
          return await db.query.users.findMany({
            orderBy: (u) => u.name,
          });

        case "Payment types":
          return await db.query.paymentTypes.findMany({
            orderBy: (p: any) => p.name,
          });

        case "Invoice list":
          return await db.query.documents.findMany({
            where: filters?.customerId
              ? eq(documents.customerId, filters.customerId)
              : undefined,
            with: {
              customer: true,
              user: true,
            },
            orderBy: (d) => d.date,
          });

        case "Daily sales": {
          const docs = await db.query.documents.findMany({
            where: and(
              eq(documents.status, "posted"),
              filters?.from ? gte(documents.date, filters.from) : undefined,
              filters?.to ? lte(documents.date, filters.to) : undefined,
            ),
          });
          const grouped: Record<string, any> = {};
          docs.forEach((doc) => {
            const dateStr = doc.date.toISOString().split("T")[0];
            if (!grouped[dateStr]) {
              grouped[dateStr] = { date: dateStr, total: 0, count: 0 };
            }
            grouped[dateStr].total += doc.total ?? 0;
            grouped[dateStr].count += 1;
          });
          return Object.values(grouped).sort((a, b) =>
            a.date.localeCompare(b.date),
          );
        }

        case "Unpaid sales":
          return await db.query.documents.findMany({
            where: and(
              eq(documents.status, "posted"),
              eq(documents.paid, false),
            ),
            with: { customer: true },
            orderBy: (d) => d.date,
          });

        case "Refunds":
          const allRefunds = await db.query.documents.findMany({
            with: { customer: true },
            orderBy: (d: any) => d.date,
          });
          return allRefunds.filter((d: any) => d.number.startsWith("REF-"));

        case "Item list":
          return await db.query.documentItems.findMany({
            orderBy: (i) => i.name,
          });

        case "Hourly sales": {
          const docs = await db.query.documents.findMany({
            where: and(
              eq(documents.status, "posted"),
              filters?.from ? gte(documents.date, filters.from) : undefined,
              filters?.to ? lte(documents.date, filters.to) : undefined,
            ),
          });
          const grouped: Record<string, any> = {};
          docs.forEach((doc) => {
            const hour = doc.date.getHours();
            const key = `${hour}:00`;
            if (!grouped[key]) {
              grouped[key] = { hour: key, total: 0, count: 0 };
            }
            grouped[key].total += doc.total ?? 0;
            grouped[key].count += 1;
          });
          return Object.values(grouped).sort(
            (a, b) =>
              parseInt(a.hour.split(":")[0]) - parseInt(b.hour.split(":")[0]),
          );
        }

        case "Profit & margin": {
          const allDocs = await db.query.documentItems.findMany();
          return allDocs.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            priceBeforeTax: item.priceBeforeTax,
            taxRate: item.taxRate ?? 0,
            total: item.total,
          }));
        }

        default:
          return [];
      }
    },
  });
}
