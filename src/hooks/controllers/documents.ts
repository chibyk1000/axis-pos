import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import {
  documents,
  documentItems,
  documentPayments,
  customers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
      console.log("useDocuments - Query starting...");
      const [docs, items, payments, custs] = await Promise.all([
        db.select().from(documents).orderBy(desc(documents.createdAt)),
        db.select().from(documentItems),
        db.select().from(documentPayments),
        db.select().from(customers),
      ]);

      console.log("useDocuments - Raw data from DB:", {
        docsCount: docs.length,
        itemsCount: items.length,
        paymentsCount: payments.length,
        paymentsData: payments.slice(0, 5).map((p) => ({
          id: p.id,
          documentId: p.documentId,
          amount: p.amount,
          paymentType: p.paymentType,
        })),
      });

      const customerMap = Object.fromEntries(custs.map((c) => [c.id, c]));

      const result = docs.map((doc) => {
        const docPayments = payments.filter((p) => p.documentId === doc.id);
        const itemsForDoc = items.filter((i) => i.documentId === doc.id);

        // Debug: show all recent docs
        console.log("useDocuments - Doc:", doc.number, {
          totalPaidDB: doc.totalPaid,
          paymentsFound: docPayments.length,
        });

        const withComputed = createDocumentWithComputed(
          doc,
          docPayments,
          customerMap[doc.customerId] || null,
          itemsForDoc,
        );

        if (withComputed.totalPaid > 0 || docPayments.length > 0) {
          console.log(
            "useDocuments - Retrieved document with payments from DB:",
            {
              id: doc.id,
              number: doc.number,
              total: doc.total,
              totalPaidInDB: doc.totalPaid,
              paymentsInDB: docPayments.length,
              paymentAmounts: docPayments.map((p) => p.amount),
              calculatedTotalPaid: withComputed.totalPaid,
              calculatedOutstandingBalance: withComputed.outstandingBalance,
            },
          );
        }

        return withComputed;
      });

      console.log(
        "useDocuments - Query complete, returning",
        result.length,
        "documents",
      );
      return result;
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
