import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { and, count, eq, isNull, like, or } from "drizzle-orm";
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
  page: (
    page: number,
    pageSize: number,
    search: string,
    includeInactive: boolean,
  ) => [...userKeys.all, "page", page, pageSize, search, includeInactive] as const,
  count: (search: string, includeInactive: boolean) =>
    [...userKeys.all, "count", search, includeInactive] as const,
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

/** DB-level paginated users list. */
export function useUsersPage(
  page: number,
  pageSize: number,
  search: string = "",
  includeInactive: boolean = true,
) {
  return useQuery({
    queryKey: userKeys.page(page, pageSize, search, includeInactive),
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const clauses = [
        search.trim()
          ? or(
              like(users.name, `%${search.trim()}%`),
              like(users.email, `%${search.trim()}%`),
            )
          : undefined,
        includeInactive
          ? undefined
          : or(eq(users.deleted_at, "NULL"), isNull(users.deleted_at)),
      ].filter(Boolean);

      return db.query.users.findMany({
        where: clauses.length ? and(...clauses) : undefined,
        limit: pageSize,
        offset,
        orderBy: (u) => u.id,
      });
    },
    placeholderData: (prev) => prev,
  });
}

/** Total user count for pagination. */
export function useUsersCount(search: string = "") {
  return useQuery({
    queryKey: userKeys.count(search, true),
    queryFn: async () => {
      const [row] = await db
        .select({ total: count(users.id) })
        .from(users)
        .where(
          search.trim()
            ? or(
                like(users.name, `%${search.trim()}%`),
                like(users.email, `%${search.trim()}%`),
              )
            : undefined,
        );
      return row?.total ?? 0;
    },
  });
}

export function useVisibleUsersCount(
  search: string = "",
  includeInactive: boolean = true,
) {
  return useQuery({
    queryKey: userKeys.count(search, includeInactive),
    queryFn: async () => {
      const clauses = [
        search.trim()
          ? or(
              like(users.name, `%${search.trim()}%`),
              like(users.email, `%${search.trim()}%`),
            )
          : undefined,
        includeInactive
          ? undefined
          : or(eq(users.deleted_at, "NULL"), isNull(users.deleted_at)),
      ].filter(Boolean);
      const [row] = await db
        .select({ total: count(users.id) })
        .from(users)
        .where(clauses.length ? and(...clauses) : undefined);
      return row?.total ?? 0;
    },
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
      await db.insert(users).values(data);
      return data;
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
      await db
        .update(users)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where(eq(users.id, id));
      const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
      return updated as User;
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
      await db
        .update(users)
        .set({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where(eq(users.id, id));
      const deleted = await db.query.users.findFirst({ where: eq(users.id, id) });
      return deleted as User;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  });
}
