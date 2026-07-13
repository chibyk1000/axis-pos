import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { documents, nodes, cashEntries, openSales } from "@/db/schema";

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

/** Which filter controls are meaningful for each report type, so the UI can
 * hide controls that a report wouldn't apply. */
export const REPORT_FILTER_SUPPORT: Record<
  ReportType,
  { dateRange: boolean; customer: boolean }
> = {
  Products: { dateRange: false, customer: false },
  "Product groups": { dateRange: false, customer: false },
  Customers: { dateRange: false, customer: false },
  "Tax rates": { dateRange: false, customer: false },
  Users: { dateRange: false, customer: false },
  "Item list": { dateRange: false, customer: false },
  "Payment types": { dateRange: false, customer: false },
  "Payment types by users": { dateRange: true, customer: false },
  "Payment types by customers": { dateRange: true, customer: true },
  Refunds: { dateRange: true, customer: true },
  "Invoice list": { dateRange: true, customer: true },
  "Daily sales": { dateRange: true, customer: true },
  "Hourly sales": { dateRange: true, customer: true },
  "Hourly sales by product groups": { dateRange: true, customer: true },
  "Table or order number": { dateRange: true, customer: true },
  "Profit & margin": { dateRange: false, customer: false },
  "Unpaid sales": { dateRange: true, customer: true },
  "Starting cash entries": { dateRange: true, customer: false },
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

        case "Product groups":
          return await db.query.nodes.findMany({
            where: eq(nodes.type, "group"),
            orderBy: (n) => n.name,
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

        case "Payment types by users": {
          const payments = await db.query.documentPayments.findMany({
            with: { document: { with: { user: true } } },
          });
          const grouped: Record<string, any> = {};
          payments.forEach((p: any) => {
            const docDate = p.document?.date;
            if (filters?.from && (!docDate || docDate < filters.from)) return;
            if (filters?.to && (!docDate || docDate > filters.to)) return;

            const userName = p.document?.user?.name ?? "Unknown";
            const paymentType = p.paymentType ?? "Unknown";
            const key = `${userName}|${paymentType}`;
            if (!grouped[key]) {
              grouped[key] = { user: userName, paymentType, total: 0, count: 0 };
            }
            grouped[key].total += p.amount ?? 0;
            grouped[key].count += 1;
          });
          return Object.values(grouped).sort((a: any, b: any) =>
            a.user.localeCompare(b.user),
          );
        }

        case "Payment types by customers": {
          const payments = await db.query.documentPayments.findMany({
            with: { document: { with: { customer: true } } },
          });
          const grouped: Record<string, any> = {};
          payments.forEach((p: any) => {
            const docDate = p.document?.date;
            if (filters?.from && (!docDate || docDate < filters.from)) return;
            if (filters?.to && (!docDate || docDate > filters.to)) return;
            if (
              filters?.customerId &&
              p.document?.customerId !== filters.customerId
            )
              return;

            const customerName = p.document?.customer?.name ?? "Unknown";
            const paymentType = p.paymentType ?? "Unknown";
            const key = `${customerName}|${paymentType}`;
            if (!grouped[key]) {
              grouped[key] = {
                customer: customerName,
                paymentType,
                total: 0,
                count: 0,
              };
            }
            grouped[key].total += p.amount ?? 0;
            grouped[key].count += 1;
          });
          return Object.values(grouped).sort((a: any, b: any) =>
            a.customer.localeCompare(b.customer),
          );
        }

        case "Invoice list":
          return await db.query.documents.findMany({
            where: and(
              filters?.customerId
                ? eq(documents.customerId, filters.customerId)
                : undefined,
              filters?.from ? gte(documents.date, filters.from) : undefined,
              filters?.to ? lte(documents.date, filters.to) : undefined,
            ),
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
              filters?.customerId
                ? eq(documents.customerId, filters.customerId)
                : undefined,
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
              filters?.customerId
                ? eq(documents.customerId, filters.customerId)
                : undefined,
              filters?.from ? gte(documents.date, filters.from) : undefined,
              filters?.to ? lte(documents.date, filters.to) : undefined,
            ),
            with: { customer: true },
            orderBy: (d) => d.date,
          });

        case "Refunds": {
          const allRefunds = await db.query.documents.findMany({
            where: and(
              filters?.customerId
                ? eq(documents.customerId, filters.customerId)
                : undefined,
              filters?.from ? gte(documents.date, filters.from) : undefined,
              filters?.to ? lte(documents.date, filters.to) : undefined,
            ),
            with: { customer: true },
            orderBy: (d: any) => d.date,
          });
          return allRefunds.filter((d: any) => d.number.startsWith("REF-"));
        }

        case "Item list":
          return await db.query.documentItems.findMany({
            orderBy: (i) => i.name,
          });

        case "Hourly sales": {
          const docs = await db.query.documents.findMany({
            where: and(
              eq(documents.status, "posted"),
              filters?.customerId
                ? eq(documents.customerId, filters.customerId)
                : undefined,
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

        case "Hourly sales by product groups": {
          const items = await db.query.documentItems.findMany({
            with: {
              document: true,
              product: { with: { node: true } },
            },
          });
          const grouped: Record<string, any> = {};
          items.forEach((item: any) => {
            const doc = item.document;
            if (!doc || doc.status !== "posted") return;
            if (
              filters?.customerId &&
              doc.customerId !== filters.customerId
            )
              return;
            if (filters?.from && doc.date < filters.from) return;
            if (filters?.to && doc.date > filters.to) return;

            const hour = doc.date.getHours();
            const groupName = item.product?.node?.name ?? "Unknown";
            const key = `${hour}:00|${groupName}`;
            if (!grouped[key]) {
              grouped[key] = {
                hour: `${hour}:00`,
                group: groupName,
                total: 0,
                count: 0,
              };
            }
            grouped[key].total += item.total ?? 0;
            grouped[key].count += 1;
          });
          return Object.values(grouped).sort(
            (a: any, b: any) =>
              parseInt(a.hour.split(":")[0]) - parseInt(b.hour.split(":")[0]) ||
              a.group.localeCompare(b.group),
          );
        }

        case "Table or order number":
          return await db.query.openSales.findMany({
            where: and(
              filters?.customerId
                ? eq(openSales.customerId, filters.customerId)
                : undefined,
              filters?.from ? gte(openSales.createdAt, filters.from) : undefined,
              filters?.to ? lte(openSales.createdAt, filters.to) : undefined,
            ),
            orderBy: (o) => [desc(o.createdAt)],
          });

        case "Starting cash entries":
          return await db.query.cashEntries.findMany({
            where: and(
              eq(cashEntries.type, "in"),
              filters?.from ? gte(cashEntries.createdAt, filters.from) : undefined,
              filters?.to ? lte(cashEntries.createdAt, filters.to) : undefined,
            ),
            orderBy: (c) => [desc(c.createdAt)],
          });

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
