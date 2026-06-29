// hooks/controllers/paymentTypes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PaymentType, paymentTypes } from "@/db/schema/paymentTypes";
import { count, eq, like, or } from "drizzle-orm";
import { db } from "@/db/database";

export const paymentTypeKeys = {
  all: ["paymentTypes"] as const,
  page: (page: number, pageSize: number, search: string) =>
    ["paymentTypes", "page", page, pageSize, search] as const,
  count: (search: string) => ["paymentTypes", "count", search] as const,
};

// Fetch all payment types
export function usePaymentTypes() {
  return useQuery({
    queryKey: paymentTypeKeys.all,
    queryFn: () =>
      db.select().from(paymentTypes).orderBy(paymentTypes.position),
  });
}

export function usePaymentTypesPage(
  page: number,
  pageSize: number,
  search: string = "",
) {
  return useQuery({
    queryKey: paymentTypeKeys.page(page, pageSize, search),
    queryFn: () =>
      db
        .select()
        .from(paymentTypes)
        .where(
          search.trim()
            ? or(
                like(paymentTypes.name, `%${search.trim()}%`),
                like(paymentTypes.code, `%${search.trim()}%`),
              )
            : undefined,
        )
        .orderBy(paymentTypes.position, paymentTypes.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    placeholderData: (prev) => prev,
  });
}

export function usePaymentTypesCount(search: string = "") {
  return useQuery({
    queryKey: paymentTypeKeys.count(search),
    queryFn: async () => {
      const [row] = await db
        .select({ total: count(paymentTypes.id) })
        .from(paymentTypes)
        .where(
          search.trim()
            ? or(
                like(paymentTypes.name, `%${search.trim()}%`),
                like(paymentTypes.code, `%${search.trim()}%`),
              )
            : undefined,
        );
      return row?.total ?? 0;
    },
  });
}

// Create a new payment type
export function useCreatePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<PaymentType, "id" | "createdAt" | "updatedAt">,
    ) => {
      await db.insert(paymentTypes).values({
        id: crypto.randomUUID(),
        ...data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentTypeKeys.all }),
  });
}

// Update payment type
export function useUpdatePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PaymentType>;
    }) => {
      await db.update(paymentTypes).set(data).where(eq(paymentTypes.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentTypeKeys.all }),
  });
}

// Delete payment type
export function useDeletePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(paymentTypes).where(eq(paymentTypes.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentTypeKeys.all }),
  });
}
