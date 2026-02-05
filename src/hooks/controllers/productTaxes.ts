import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { productTaxes } from "@/db/schema/productTaxes";
import { products } from "@/db/schema/products";
import { taxes } from "@/db/schema/taxes";
import { db } from "@/db/database";
import { and, eq } from "drizzle-orm";

type ProductTax = {
  productId: string;
  productName: string;
  taxId: string;
  taxName: string;
};

// ----------------- READ -----------------
export function useProductTaxes() {
  return useQuery<ProductTax[]>({
    queryKey: ["productTaxes"],
    queryFn: async () => {
      const rows = await db
        .select({
          productId: productTaxes.productId,
          productName: products.title,
          taxId: productTaxes.taxId,
          taxName: taxes.name,
        })
        .from(productTaxes)
        .innerJoin(products, eq(productTaxes.productId, products.id))
        .innerJoin(taxes, eq(productTaxes.taxId,taxes.id));

      return rows;
    },
  });
}

// ----------------- CREATE -----------------
export function useAddProductTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      taxId,
    }: {
      productId: string;
      taxId: string;
    }) => {
      await db.insert(productTaxes).values({ productId, taxId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productTaxes"] });
    },
  });
}

// ----------------- UPDATE -----------------
// Usually productId+taxId is the primary key, so "update" may mean changing taxId for a product
export function useUpdateProductTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      oldTaxId,
      newTaxId,
    }: {
      productId: string;
      oldTaxId: string;
      newTaxId: string;
    }) => {
      await db
        .update(productTaxes)
        .set({ taxId: newTaxId })
        .where(
          and(
            eq(productTaxes.taxId, oldTaxId),
            eq(productTaxes.productId, productId),
          ),
        );
    },
      onSuccess: () => qc.invalidateQueries({queryKey: ["productTaxes"]}),
  });
}

// ----------------- DELETE -----------------
export function useDeleteProductTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      // taxId,
    }: {
      productId: string;
      // taxId: string;
    }) => {
      await db
        .delete(productTaxes)
        .where(
          and(
            eq(productTaxes.productId, productId),
            // eq(productTaxes.taxId, taxId),
          ),
        );
    },
    onSuccess: () => qc.invalidateQueries({queryKey: ["productTaxes"]}),
  });
}
