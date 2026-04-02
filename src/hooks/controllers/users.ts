import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { User, NewUser } from "@/db/schema";

export type { User, NewUser };

/* -------------------------------------------------------------------------- */
/*                                    KEYS                                    */
/* -------------------------------------------------------------------------- */

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
  byId: (id: string) => [...userKeys.all, "byId", id] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  QUERIES                                   */
/* -------------------------------------------------------------------------- */

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => db.query.users.findMany({ orderBy: (u) => u.id }),
  });
}

export function useUserById(id: string) {
  return useQuery({
    queryKey: userKeys.byId(id),
    enabled: !!id,
    queryFn: async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(id)),
      });
      if (!user) throw new Error("User not found");
      return user;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                 MUTATIONS                                  */
/* -------------------------------------------------------------------------- */

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewUser) => {
      const [created] = await db.insert(users).values(data).returning();
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Omit<User, "id">>;
    }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!existing) throw new Error("User not found");
      const [updated] = await db
        .update(users)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where(eq(users.id, id))
        .returning();
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.byId(String(id)) });
      qc.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

/** Soft-delete: stamps deleted_at, keeps the row */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!existing) throw new Error("User not found");
      const [deleted] = await db
        .update(users)
        .set({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where(eq(users.id, id))
        .returning();
      return deleted;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  });
}
