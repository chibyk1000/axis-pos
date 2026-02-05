import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database"; // your Drizzle db instance
import { eq } from "drizzle-orm";

import { productTaxes, taxes } from "@/db/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Tax = InferSelectModel<typeof taxes>;
export type NewTax = InferInsertModel<typeof taxes>;

/* -------------------------------------------------------------------------- */
/*                                   KEYS                                     */
/* -------------------------------------------------------------------------- */

export const taxKeys = {
  all: ["taxes"] as const,
  list: () => [...taxKeys.all, "list"] as const,
  byId: (id: string) => [...taxKeys.all, "byId", id] as const,
};

/* -------------------------------------------------------------------------- */
/*                                   QUERIES                                  */
/* -------------------------------------------------------------------------- */

/** Get all taxes */
export function useTaxes() {
  return useQuery({
    queryKey: taxKeys.list(),
    queryFn: async () =>
      db.query.taxes.findMany({
        orderBy: (t) => t.createdAt,
      }),
  });
}

/** Get single tax by id */
export function useTaxById(id: string) {
  return useQuery({
    queryKey: taxKeys.byId(id),
    enabled: !!id,
    queryFn: async () => {
      const tax = await db.query.taxes.findFirst({
        where: eq(taxes.id, id),
      });
      if (!tax) throw new Error("Tax not found");
      return tax;
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                  MUTATIONS                                 */
/* -------------------------------------------------------------------------- */

/** Create new tax */
export function useCreateTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewTax) => {
      const [created] = await db.insert(taxes).values(data).returning();
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taxKeys.list() });
    },
  });
}

/** Update existing tax */
export function useUpdateTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Tax, "id" | "createdAt">>;
    }) => {
      // First, check if tax exists
      const existing = await db.query.taxes.findFirst({
        where: eq(taxes.id, id),
      });

      if (!existing) throw new Error("Tax not found");

      // Then update
      const [updated] = await db
        .update(taxes)
        .set(data)
        .where(eq(taxes.id, id))
        .returning();

     

      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: taxKeys.byId(id) });
      qc.invalidateQueries({ queryKey: taxKeys.list() });
    },
  });
}

/** Delete tax */
export function useDeleteTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, find the tax
      const taxToDelete = await db.query.taxes.findFirst({
        where: eq(taxes.id, id),
      });

      if (!taxToDelete) throw new Error("Tax not found");

      // Delete it
      await db.delete(taxes).where(eq(taxes.id, id));

      // Return the deleted tax for reference
      return taxToDelete;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taxKeys.list() });
    },
  });
}





export function useSwitchTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oldTaxId,
      newTaxId,
    }: {
      oldTaxId: string;
      newTaxId: string;
    }) => {
      // 1. Get all products that have old tax
      const rows = await db.query.productTaxes.findMany({
        where: eq(productTaxes.taxId, oldTaxId),
      });

      // 2. Delete old tax links
      await db.delete(productTaxes).where(eq(productTaxes.taxId, oldTaxId));

      // 3. Recreate with new tax (deduplicated)
      const inserts = Array.from(new Set(rows.map((r) => r.productId))).map(
        (productId) => ({
          productId,
          taxId: newTaxId,
        }),
      );

      if (inserts.length) {
        await db.insert(productTaxes).values(inserts);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
