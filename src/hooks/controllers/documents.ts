import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { documents, documentItems, documentPayments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentItem = typeof documentItems.$inferInsert;
export type DocumentPayment = typeof documentPayments.$inferInsert;

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      return await db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt));
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
        .from(documentItems)
        .where(eq(documentItems.documentId, id));

      return {
        ...doc,
        items,
        payments: docPayments,
      };
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
      await db.transaction(async (tx) => {
        const docId = randomUUID();

        await tx.insert(documents).values({
          ...data.document,
          id: docId,
          createdAt: new Date(),
        });

        if (data.items?.length) {
          await tx.insert(documentItems).values(
            data.items.map((item) => ({
              ...item,
              id: randomUUID(),
              documentId: docId,
            })),
          );
        }

        if (data.payments?.length) {
          await tx.insert(documentPayments).values(
            data.payments.map((p) => ({
              ...p,
              id: randomUUID(),
              documentId: docId,
            })),
          );
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
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
      await db.transaction(async (tx) => {
        await tx
          .update(documents)
          .set(data.document)
          .where(eq(documents.id, data.id));

        // remove old children
        await tx
          .delete(documentItems)
          .where(eq(documentItems.documentId, data.id));

        await tx
          .delete(documentPayments)
          .where(eq(documentPayments.documentId, data.id));

        // insert new children
        if (data.items?.length) {
          await tx.insert(documentItems).values(
            data.items.map((item) => ({
              ...item,
              id: randomUUID(),
              documentId: data.id,
            })),
          );
        }

        if (data.payments?.length) {
          await tx.insert(documentPayments).values(
            data.payments.map((p) => ({
              ...p,
              id: randomUUID(),
              documentId: data.id,
            })),
          );
        }
      });
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