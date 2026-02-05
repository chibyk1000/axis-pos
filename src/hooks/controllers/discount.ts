import { db } from "@/db/database";
import { customerDiscounts } from "@/db/schema/customers";
import { eq } from "drizzle-orm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export const customerDiscountKeys = {
  all: ["customer-discounts"] as const,
  byCustomer: (customerId: string) =>
    [...customerDiscountKeys.all, "customer", customerId] as const,
};

export function useAddCustomerDiscount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      customerId: string;
      productId: string;
      discountPercent: number;
    }) => {
      const [created] = await db
        .insert(customerDiscounts)
        .values(data)
        .returning();

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomerDiscount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      productId:_i,
    }: {
      customerId: string;
      productId: string;
    }) => {
      await db
        .delete(customerDiscounts)
        .where(eq(customerDiscounts.customerId, customerId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCustomerDiscounts(customerId: string) {
  return useQuery({
    queryKey: customerDiscountKeys.byCustomer(customerId),
    enabled: !!customerId,
    queryFn: async () => {
      return db.query.customerDiscounts.findMany({
        where: eq(customerDiscounts.customerId, customerId),
  
      });
    },
  });
}