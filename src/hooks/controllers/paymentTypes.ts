// hooks/controllers/paymentTypes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PaymentType, paymentTypes } from "@/db/schema/paymentTypes";
import { eq } from "drizzle-orm";
import { db } from "@/db/database";

// Fetch all payment types
export function usePaymentTypes() {
  return useQuery({
    queryKey: ["paymentTypes"],
    queryFn: () =>
      db.select().from(paymentTypes).orderBy(paymentTypes.position),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentTypes"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentTypes"] }),
  });
}

// Delete payment type
export function useDeletePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(paymentTypes).where(eq(paymentTypes.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentTypes"] }),
  });
}
