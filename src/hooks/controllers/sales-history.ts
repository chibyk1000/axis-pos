import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { documents, documentItems } from "@/db/schema";
import { and, gte, lte, eq, like, sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";


/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type DocumentRow = {
  id: string;
  number: string;
  externalNumber: string | null;
  customerId: string;
  customerName: string | null;
  date: Date;
  createdAt: Date;
  status: "draft" | "posted" | "cancelled" | null;
  paid: boolean | null;
  totalBeforeTax: number | null;
  taxTotal: number | null;
  total: number | null;
};

export type DocumentItemRow = {
  id: string;
  productId: string;
  name: string;
  unit: string | null;
  quantity: number;
  priceBeforeTax: number;
  taxRate: number | null;
  discount: number | null;
  total: number;
};

export type SalesFilters = {
  from: Date;
  to: Date;
  numberPrefix: string;
  customerId: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                    KEYS                                    */
/* -------------------------------------------------------------------------- */

export const salesHistoryKeys = {
  all: ["salesHistory"] as const,
  documents: (f: SalesFilters) =>
    [...salesHistoryKeys.all, "documents", JSON.stringify(f)] as const,
  items: (documentId: string) =>
    [...salesHistoryKeys.all, "items", documentId] as const,
  summary: (f: SalesFilters) =>
    [...salesHistoryKeys.all, "summary", JSON.stringify(f)] as const,
};

/* -------------------------------------------------------------------------- */
/*                            DOCUMENTS QUERY                                 */
/* -------------------------------------------------------------------------- */

export function useSalesDocuments(filters: SalesFilters) {
  return useQuery({
    queryKey: salesHistoryKeys.documents(filters),
    queryFn: async (): Promise<DocumentRow[]> => {
      const { customers } = await import("@/db/schema");

      const conditions = [
        gte(documents.date, filters.from),
        lte(documents.date, filters.to),
      ];
      if (filters.numberPrefix.trim()) {
        conditions.push(
          like(documents.number, `${filters.numberPrefix.trim()}%`),
        );
      }
      if (filters.customerId) {
        conditions.push(eq(documents.customerId, filters.customerId));
      }

      const rows = await db
        .select({
          id: documents.id,
          number: documents.number,
          externalNumber: documents.externalNumber,
          customerId: documents.customerId,
          customerName: customers.name,
          date: documents.date,
          createdAt: documents.createdAt,
          status: documents.status,
          paid: documents.paid,
          totalBeforeTax: documents.totalBeforeTax,
          taxTotal: documents.taxTotal,
          total: documents.total,
        })
        .from(documents)
        .leftJoin(customers, eq(documents.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(documents.date));

      return rows as DocumentRow[];
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                          DOCUMENT ITEMS QUERY                              */
/* -------------------------------------------------------------------------- */

export function useDocumentItems(documentId: string | null) {
  return useQuery({
    queryKey: salesHistoryKeys.items(documentId ?? ""),
    enabled: !!documentId,
    queryFn: (): Promise<DocumentItemRow[]> =>
      db
        .select()
        .from(documentItems)
        .where(eq(documentItems.documentId, documentId!)) as Promise<
        DocumentItemRow[]
      >,
  });
}

/* -------------------------------------------------------------------------- */
/*                             SUMMARY STATS                                  */
/* -------------------------------------------------------------------------- */

export function useSalesSummary(filters: SalesFilters) {
  return useQuery({
    queryKey: salesHistoryKeys.summary(filters),
    queryFn: async () => {
      const conditions = [
        gte(documents.date, filters.from),
        lte(documents.date, filters.to),
      ];
      if (filters.numberPrefix.trim()) {
        conditions.push(
          like(documents.number, `${filters.numberPrefix.trim()}%`),
        );
      }
      if (filters.customerId) {
        conditions.push(eq(documents.customerId, filters.customerId));
      }

      const [row] = await db
        .select({
          count: sql<number>`count(${documents.id})`,
          total: sql<number>`coalesce(sum(${documents.total}), 0)`,
        })
        .from(documents)
        .where(and(...conditions));

      return { count: row?.count ?? 0, total: row?.total ?? 0 };
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                           DELETE MUTATION                                  */
/* -------------------------------------------------------------------------- */

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await db.query.documents.findFirst({
        where: eq(documents.id, id),
      });
      if (!existing) throw new Error("Document not found");
      // cascade deletes documentItems via FK
      await db.delete(documents).where(eq(documents.id, id));
      return existing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesHistoryKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                           REFUND MUTATION                                  */
/*                                                                            */
/*  Creates a new document with:                                              */
/*    • number  = "REF-{original.number}"                                     */
/*    • status  = "posted"                                                    */
/*    • totals  negated                                                       */
/*    • items   quantity negated                                              */
/* -------------------------------------------------------------------------- */

export function useCreateRefundDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceDocument,
      sourceItems,
    }: {
      sourceDocument: DocumentRow;
      sourceItems: DocumentItemRow[];
    }) => {
      const refundId = nanoid();
      const refundNumber = `REF-${sourceDocument.number}`;
      const now = new Date();

      // Insert refund document
      const [refundDoc] = await db
        .insert(documents)
        .values({
          id: refundId,
          number: refundNumber,
          externalNumber: sourceDocument.number, // trace back to original
          customerId: sourceDocument.customerId,
          date: now,
          status: "posted",
          paid: true,
          totalBeforeTax: -(sourceDocument.totalBeforeTax ?? 0),
          taxTotal: -(sourceDocument.taxTotal ?? 0),
          total: -(sourceDocument.total ?? 0),
          createdAt: now,
        })
        .returning();

      // Insert negated items
      if (sourceItems.length > 0) {
        await db.insert(documentItems).values(
          sourceItems.map((item) => ({
            id: nanoid(),
            documentId: refundId,
            productId: item.productId,
            name: item.name,
            unit: item.unit,
            quantity: -item.quantity,
            priceBeforeTax: item.priceBeforeTax,
            taxRate: item.taxRate,
            discount: item.discount,
            total: -item.total,
          })),
        );
      }

      return refundDoc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesHistoryKeys.all });
    },
  });
}
