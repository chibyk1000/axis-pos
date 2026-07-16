import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import {
  documents,
  documentItems,
  documentPayments,
  customers,
} from "@/db/schema";
import { and, or, like, gte, lte, eq, desc, count } from "drizzle-orm";

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentItem = typeof documentItems.$inferInsert;
export type DocumentPayment = typeof documentPayments.$inferInsert;

// Enhanced document type with computed properties
export type DocumentWithComputed = ReturnType<
  typeof createDocumentWithComputed
>;

function createDocumentWithComputed(
  doc: Document,
  docPayments: DocumentPayment[],
  customer: any | null,
  items: DocumentItem[],
) {
  const totalPaid = docPayments.reduce((sum, p) => sum + p.amount, 0);
  const docTotal = doc.total ?? 0;
  const outstandingBalance = Math.max(0, docTotal - totalPaid);

  return {
    ...doc,
    customer,
    items,
    payments: docPayments,
    totalPaid,
    outstandingBalance,
  };
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const [docs, items, payments, custs] = await Promise.all([
        db.select().from(documents).orderBy(desc(documents.createdAt)),
        db.select().from(documentItems),
        db.select().from(documentPayments),
        db.select().from(customers),
      ]);

      // PERF: group children by documentId in one O(n) pass. This used to
      // run items.filter(...) + payments.filter(...) INSIDE the per-document
      // map — O(docs × (items + payments)), i.e. ~20 billion comparisons on
      // a 70k-doc / 215k-item imported database — plus a console.log per
      // document. That froze the entire machine every time this query ran.
      const customerMap = new Map(custs.map((c) => [c.id, c]));
      const itemsByDoc = new Map<string, (typeof items)[number][]>();
      for (const item of items) {
        const list = itemsByDoc.get(item.documentId);
        if (list) list.push(item);
        else itemsByDoc.set(item.documentId, [item]);
      }
      const paymentsByDoc = new Map<string, (typeof payments)[number][]>();
      for (const payment of payments) {
        const list = paymentsByDoc.get(payment.documentId);
        if (list) list.push(payment);
        else paymentsByDoc.set(payment.documentId, [payment]);
      }

      return docs.map((doc) =>
        createDocumentWithComputed(
          doc,
          paymentsByDoc.get(doc.id) ?? [],
          customerMap.get(doc.customerId) ?? null,
          itemsByDoc.get(doc.id) ?? [],
        ),
      );
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                     DB-LEVEL PAGINATED DOCUMENT LIST                       */
/*                                                                            */
/*  The dashboard Documents page works against tens of thousands of rows     */
/*  after an Aronium import — filtering and paging must happen in SQL, not   */
/*  by loading everything into JS (useDocuments above does that and is kept  */
/*  only for the POS documents screen).                                      */
/* -------------------------------------------------------------------------- */

export type DocumentListFilters = {
  /** users.id to restrict to, or null/undefined for all users */
  userId?: number | null;
  customerId?: string | null;
  /** app document type code (100/120/200/220/230/300/400) */
  type?: number | null;
  paid?: boolean | null;
  /** matches number, external number, or customer name */
  search?: string;
  /** date range as epoch ms (primitives keep the query key stable) */
  fromMs?: number | null;
  toMs?: number | null;
};

function documentFilterConditions(f: DocumentListFilters) {
  const conds = [];
  if (f.userId != null) conds.push(eq(documents.userId, f.userId));
  if (f.customerId) conds.push(eq(documents.customerId, f.customerId));
  if (f.type != null) conds.push(eq(documents.type, f.type));
  if (f.paid != null) conds.push(eq(documents.paid, f.paid));
  const s = f.search?.trim();
  if (s) {
    conds.push(
      or(
        like(documents.number, `%${s}%`),
        like(documents.externalNumber, `%${s}%`),
        like(customers.name, `%${s}%`),
      ),
    );
  }
  if (f.fromMs != null) conds.push(gte(documents.date, new Date(f.fromMs)));
  if (f.toMs != null) conds.push(lte(documents.date, new Date(f.toMs)));
  return conds;
}

export type DocumentPageRow = {
  id: string;
  number: string;
  externalNumber: string | null;
  customerId: string;
  customerName: string | null;
  userId: number | null;
  date: Date;
  paid: boolean | null;
  type: number | null;
  status: "draft" | "posted" | "cancelled" | null;
  total: number | null;
  totalPaid: number | null;
  outstandingBalance: number | null;
};

export function useDocumentsPage(
  filters: DocumentListFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["documents", "page", JSON.stringify(filters), page, pageSize],
    queryFn: async (): Promise<DocumentPageRow[]> => {
      const conds = documentFilterConditions(filters);
      const rows = await db
        .select({
          id: documents.id,
          number: documents.number,
          externalNumber: documents.externalNumber,
          customerId: documents.customerId,
          customerName: customers.name,
          userId: documents.userId,
          date: documents.date,
          paid: documents.paid,
          type: documents.type,
          status: documents.status,
          total: documents.total,
          totalPaid: documents.totalPaid,
          outstandingBalance: documents.outstandingBalance,
        })
        .from(documents)
        .leftJoin(customers, eq(documents.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(documents.date))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return rows as DocumentPageRow[];
    },
    placeholderData: (prev) => prev,
  });
}

export function useDocumentsCount(filters: DocumentListFilters) {
  return useQuery({
    queryKey: ["documents", "count", JSON.stringify(filters)],
    queryFn: async (): Promise<number> => {
      const conds = documentFilterConditions(filters);
      const [row] = await db
        .select({ total: count(documents.id) })
        .from(documents)
        .leftJoin(customers, eq(documents.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined);
      return row?.total ?? 0;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    enabled: !!id,
    queryFn: async () => {
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .get();

      if (!doc) return null;

      const items = await db
        .select()
        .from(documentItems)
        .where(eq(documentItems.documentId, id));

      const docPayments = await db
        .select()
        .from(documentPayments)
        .where(eq(documentPayments.documentId, id));

      return createDocumentWithComputed(doc, docPayments, null, items);
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      document: NewDocument;
      items: DocumentItem[];
      payments?: DocumentPayment[];
    }) => {
      try {
        const docId = data.document.id ?? crypto.randomUUID();

        console.log("useCreateDocument - START: Payload received:", {
          docId,
          document: {
            number: data.document.number,
            total: data.document.total,
            totalPaid: data.document.totalPaid,
            outstandingBalance: data.document.outstandingBalance,
          },
          paymentsInput: data.payments?.map((p) => ({
            amount: p.amount,
            paymentType: p.paymentType,
          })),
        });

        // Calculate totalPaid and paid status based on actual payments
        const totalPaid =
          data.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
        const docTotal = data.document.total ?? 0;
        const isPaid = totalPaid >= docTotal;

        console.log("useCreateDocument - Calculated values:", {
          totalPaid,
          docTotal,
          isPaid,
          outstandingBalance: Math.max(0, docTotal - totalPaid),
        });

        const insertPayload = {
          ...data.document,
          id: docId,
          totalPaid, // Always use calculated value
          outstandingBalance: Math.max(0, docTotal - totalPaid), // Always recalculate
          paid: isPaid, // Update paid status based on totalPaid
          createdAt: data.document.createdAt ?? new Date(),
        };

        console.log("useCreateDocument - Inserting document:", {
          number: insertPayload.number,
          total: insertPayload.total,
          totalPaid: insertPayload.totalPaid,
          outstandingBalance: insertPayload.outstandingBalance,
          paid: insertPayload.paid,
        });

        await db.insert(documents).values(insertPayload);
        console.log("useCreateDocument - Document inserted successfully");

        console.log("useCreateDocument - About to insert items and payments:", {
          itemsLength: data.items?.length,
          paymentsLength: data.payments?.length,
          paymentsArray: data.payments,
        });

        if (data.items?.length) {
          console.log(
            "useCreateDocument - Inserting",
            data.items.length,
            "items",
          );
          await db.insert(documentItems).values(
            data.items.map((item) => ({
              ...item,
              id: crypto.randomUUID(),
              documentId: docId,
            })),
          );
          console.log("useCreateDocument - Items inserted successfully");
        }

        if (data.payments?.length) {
          const paymentsToInsert = data.payments.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            documentId: docId,
          }));

          console.log("useCreateDocument - Inserting payments:", {
            count: data.payments.length,
            payments: paymentsToInsert.map((p) => ({
              amount: p.amount,
              paymentType: p.paymentType,
              date: p.date,
              status: p.status,
            })),
          });

          await db.insert(documentPayments).values(paymentsToInsert);
          console.log("useCreateDocument - Payments inserted successfully");
        } else {
          console.log(
            "useCreateDocument - No payments to insert. data.payments =",
            data.payments,
          );
        }

        console.log("useCreateDocument - COMPLETE: All inserts finished");
      } catch (err) {
        console.error("useCreateDocument - CAUGHT ERROR:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log(
        "useCreateDocument - onSuccess: Invalidating documents query",
      );
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => {
      console.error("useCreateDocument - Mutation onError:", err);
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      document: Partial<NewDocument>;
      items: DocumentItem[];
      payments?: DocumentPayment[];
    }) => {
      // Get the current document to calculate totalPaid properly
      const currentDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, data.id))
        .get();

      if (!currentDoc) throw new Error("Document not found");

      // Calculate totalPaid and paid status based on actual payments
      const totalPaid =
        data.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
      const docTotal = data.document.total ?? currentDoc.total ?? 0;
      const isPaid = totalPaid >= docTotal;

      await db
        .update(documents)
        .set({
          ...data.document,
          totalPaid, // Always use calculated value
          outstandingBalance: Math.max(0, docTotal - totalPaid), // Always recalculate
          paid: isPaid, // Update paid status based on totalPaid
        })
        .where(eq(documents.id, data.id));

      // remove old children
      await db
        .delete(documentItems)
        .where(eq(documentItems.documentId, data.id));
      await db
        .delete(documentPayments)
        .where(eq(documentPayments.documentId, data.id));

      // insert new children
      if (data.items?.length) {
        await db.insert(documentItems).values(
          data.items.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            documentId: data.id,
          })),
        );
      }

      if (data.payments?.length) {
        await db.insert(documentPayments).values(
          data.payments.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            documentId: data.id,
          })),
        );
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents", variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(documents).where(eq(documents.id, id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
