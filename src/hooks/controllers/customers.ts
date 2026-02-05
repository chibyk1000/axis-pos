import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq } from "drizzle-orm";

import { customers, loyaltyCards, customerDiscounts } from "@/db/schema";

import type {
  Customer,
  NewCustomer,

  NewLoyaltyCard,

  NewCustomerDiscount,
} from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

export const customerKeys = {
  all: ["customers"] as const,
  list: () => [...customerKeys.all, "list"] as const,
  byId: (id: string) => [...customerKeys.all, "byId", id] as const,
  loyaltyCards: (customerId: string) =>
    [...customerKeys.all, "loyaltyCards", customerId] as const,
};

/* -------------------------------------------------------------------------- */
/*                                   QUERIES                                  */
/* -------------------------------------------------------------------------- */

/** Get all customers (with relations) */
export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: async () => {
      
   const res =    await  db.query.customers.findMany({
          orderBy: (c) => c.createdAt,
          with: {
            loyaltyCards: true,
            discounts: true,
          },
   })
      
     
      return res
      
    }
  });
}

/** Get single customer by id */
export function useCustomerById(id: string) {
  return useQuery({
    queryKey: customerKeys.byId(id),
    enabled: !!id,
    queryFn: async () => {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, id),
        with: {
          loyaltyCards: true,
          discounts: true,
        },
      });

      if (!customer) throw new Error("Customer not found");
      return customer;
    },
  });
}

/** Get loyalty cards for customer */
export function useCustomerLoyaltyCards(customerId: string) {
  return useQuery({
    queryKey: customerKeys.loyaltyCards(customerId),
    enabled: !!customerId,
    queryFn: async () => {
      
   const res =   await db.query.loyaltyCards.findMany({
        where: eq(loyaltyCards.customerId, customerId),
        orderBy: (l) => l.createdAt,
   })
      return res
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                                  MUTATIONS                                 */
/* -------------------------------------------------------------------------- */

/** Create customer */
export function useCreateCustomer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewCustomer) => {
      const created = await db.insert(customers).values(data)
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/** Update customer */
export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Customer, "id" | "createdAt">>;
    }) => {
      // 1️⃣ Find existing customer
      const existing = await db.query.customers.findFirst({
        where: eq(customers.id, id),
      });
      if (!existing) {
        throw new Error("Customer not found");
      }
      // 2️⃣ Update customer
      await db.update(customers).set(data).where(eq(customers.id, id));

      // 3️⃣ Fetch updated row (SQLite-safe)
      const updated = await db.query.customers.findFirst({
        where: eq(customers.id, id),
      });

      if (!updated) {
        throw new Error("Failed to fetch updated customer");
      }

      return updated;
    },

    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: customerKeys.byId(id) });
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}


/** Delete customer */
export function useDeleteCustomer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Customer> => {
      // 1. Fetch the customer first
      const [customerToDelete] = await db.query.customers.findMany({
        where: eq(customers.id, id),
      });

      if (!customerToDelete) throw new Error("Customer not found");

      // 2. Delete the customer
      await db.delete(customers).where(eq(customers.id, id));

      // 3. Return the deleted customer
      return customerToDelete;
    },
    onSuccess: (deletedCustomer) => {
      // Invalidate queries to refresh the list
      qc.invalidateQueries({ queryKey: customerKeys.all });

      // Optional: you can log or show a toast
      console.log("Deleted customer:", deletedCustomer);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              LOYALTY CARDS                                 */
/* -------------------------------------------------------------------------- */

/** Add loyalty card */
export function useAddLoyaltyCard(customerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewLoyaltyCard) => {
      const [created] = await db.insert(loyaltyCards).values(data).returning();

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: customerKeys.loyaltyCards(customerId),
      });
    },
  });
}

/** Delete loyalty card */
export function useDeleteLoyaltyCard(customerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(loyaltyCards).where(eq(loyaltyCards.id, id));
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: customerKeys.loyaltyCards(customerId),
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                          CUSTOMER DISCOUNTS                                 */
/* -------------------------------------------------------------------------- */

export function useAddCustomerDiscount(customerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewCustomerDiscount) => {
      const [created] = await db
        .insert(customerDiscounts)
        .values(data)
        .returning();

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.byId(customerId) });
    },
  });
}

export function useDeleteCustomerDiscount(customerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(customerDiscounts).where(eq(customerDiscounts.id, id));
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.byId(customerId) });
    },
  });
}
