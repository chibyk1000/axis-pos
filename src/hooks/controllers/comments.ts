import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// your Drizzle DB instance
import { comments } from "@/db/schema/comments";

import { asc, eq, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { db } from "@/db/database";

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;

// ----------------- READ -----------------
export function useComments(productId: string) {
  return useQuery<Comment[]>({
    queryKey: ["comments", productId],
    queryFn: async () => {
      // Fetch all comments for the product
      const allComments = await db
        .select()
        .from(comments)
        .where(eq(comments.productId,productId))
        .orderBy(asc( comments.createdAt)); // oldest first

      // Build nested comment tree
      function buildTree(
        list: Comment[],
        parentId: string | null = null,
      ): Comment[] {
        return list
          .filter((c) => c.parentId === parentId)
          .map((c) => ({
            ...c,
            children: buildTree(list, c.id), // recursive children
          }));
      }

      return buildTree(allComments);
    },
  });
}

// ----------------- CREATE -----------------
export function useAddComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (newComment: NewComment) => {
      await db.insert(comments).values(newComment);
    },
    onSuccess: (_, newComment) => {
        qc.invalidateQueries({ queryKey: ["comments", newComment.productId] });
    },
  });
}

// ----------------- UPDATE -----------------
export function useUpdateComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
   
      content,
      isEdited,
    }: {
      id: string;
      productId: string;
      content: string;
      isEdited?: boolean;
    }) => {
      await db
        .update(comments)
        .set({
          content,
          isEdited: isEdited ?? true,
        })
        .where(eq(comments.id,id));
    },
    onSuccess: (_, variables) => {
        qc.invalidateQueries({ queryKey: ["comments", variables.productId] });
    },
  });
}

// ----------------- DELETE -----------------
export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
  
    }: {
      id: string;
     
    }) => {
      await db.delete(comments).where(eq(comments.id,id));
    },
    onSuccess: (_, variables) => {
        qc.invalidateQueries({ queryKey: ["comments", variables.id] });
    },
  });
}
