import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { documentItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export type DocumentItem = typeof documentItems.$inferSelect;
export type NewDocumentItem = typeof documentItems.$inferInsert;

export function useDocumentItems(documentId: string) {
  return useQuery({
    queryKey: ["document-items", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      return await db
        .select()
        .from(documentItems)
        .where(eq(documentItems.documentId, documentId));
    },
  });
}

export function useCreateDocumentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewDocumentItem) => {
      const id = crypto.randomUUID();

      await db.insert(documentItems).values({
        ...data,
        id,
      });

      return { ...data, id };
    },

    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ["document-items", data.documentId],
      });
    },
  });
}

export function useUpdateDocumentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      updates: Partial<NewDocumentItem>;
      documentId: string;
    }) => {
      await db
        .update(documentItems)
        .set(data.updates)
        .where(eq(documentItems.id, data.id));

      return data;
    },

    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ["document-items", data.documentId],
      });
    },
  });
}

export function useDeleteDocumentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; documentId: string }) => {
      await db.delete(documentItems).where(eq(documentItems.id, data.id));
      return data;
    },

    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ["document-items", data.documentId],
      });
    },
  });
}
