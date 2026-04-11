import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, and } from "drizzle-orm";
import { productPrices } from "@/db/schema";
import { nanoid } from "nanoid";
import type { ProductPrice, NewProductPrice } from "@/db/schema";

export type { ProductPrice };

/* -------------------------------------------------------------------------- */
/* LABEL ↔ BOOLEAN BRIDGE                                                     */
/* -------------------------------------------------------------------------- */

export type PriceLabel = "Retail" | "Wholesale";
export const PRICE_LABELS: PriceLabel[] = ["Retail", "Wholesale"];

/** PriceLabel → wholeSale DB boolean */
export function labelToWholeSale(label: PriceLabel): boolean {
  return label === "Wholesale";
}

/** wholeSale DB boolean → PriceLabel */
export function wholeSaleToLabel(wholeSale: boolean): PriceLabel {
  return wholeSale ? "Wholesale" : "Retail";
}

/* -------------------------------------------------------------------------- */
/* QUERY KEYS                                                                  */
/* -------------------------------------------------------------------------- */

export const productPriceKeys = {
  all: ["productPrices"] as const,
  byProduct: (productId: string) =>
    [...productPriceKeys.all, "product", productId] as const,
  byLabel: (label: PriceLabel) =>
    [...productPriceKeys.all, "label", label] as const,
  byProductLabel: (productId: string, label: PriceLabel) =>
    [...productPriceKeys.all, productId, label] as const,
  default: () => [...productPriceKeys.all, "default"] as const,
};


export function useSetDefaultProductPrice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      priceId,
    }: {
      productId: string;
      priceId: string;
    }) => {
      // 🔒 Use transaction (VERY important)
      await db.transaction(async (tx) => {
        // 1. Clear existing defaults for THIS product only
        await tx
          .update(productPrices)
          .set({ isDefault: false })
          .where(eq(productPrices.productId, productId));

        // 2. Set selected price as default
        await tx
          .update(productPrices)
          .set({
            isDefault: true,
            updatedAt: new Date(),
          })
          .where(eq(productPrices.id, priceId));
      });

      return { productId, priceId };
    },

    onSuccess: ({ productId }) => {
      qc.invalidateQueries({
        queryKey: productPriceKeys.byProduct(productId),
      });
      qc.invalidateQueries({
        queryKey: productPriceKeys.default(),
      });
      qc.invalidateQueries({
        queryKey: productPriceKeys.all,
      });
    },
  });
}
/* -------------------------------------------------------------------------- */
/* QUERIES                                                                     */
/* -------------------------------------------------------------------------- */
export async function getProductPrices(productId: string) {
  return db.query.productPrices.findMany({
    where: eq(productPrices.productId, productId),
    orderBy: (p) => p.createdAt,
  });
}
/** All price rows for one product (both Retail + Wholesale) */
export function useProductPrices(productId: string) {
  return useQuery({
    queryKey: productPriceKeys.byProduct(productId),
    enabled: !!productId,
    queryFn: () =>
      db.query.productPrices.findMany({
        where: eq(productPrices.productId, productId),
        orderBy: (p) => p.createdAt,
      }),
  });
}

/** All product prices for a given label */
export function useProductPricesByLabel(label: PriceLabel) {
  return useQuery({
    queryKey: productPriceKeys.byLabel(label),
    enabled: !!label,
    queryFn: () =>
      db.query.productPrices.findMany({
        where: eq(productPrices.wholeSale, labelToWholeSale(label)),
        with: { product: true },
      }),
  });
}

/** Single price row by product + label */
export function useProductPriceByLabel(productId: string, label: PriceLabel) {
  return useQuery({
    queryKey: productPriceKeys.byProductLabel(productId, label),
    enabled: !!productId && !!label,
    queryFn: async () => {
      const row = await db.query.productPrices.findFirst({
        where: and(
          eq(productPrices.productId, productId),
          eq(productPrices.wholeSale, labelToWholeSale(label)),
        ),
      });
      return row ?? null;
    },
  });
}

/**
 * All price rows grouped by label.
 * Returns: { Retail: ProductPrice[], Wholesale: ProductPrice[] }
 */
export function useAllLabelPrices() {
  return useQuery({
    queryKey: productPriceKeys.all,
    queryFn: async () => {
      const rows = await db.query.productPrices.findMany({
        orderBy: (p) => p.createdAt,
      });

      const grouped: Record<PriceLabel, ProductPrice[]> = {
        Retail: [],
        Wholesale: [],
      };

      for (const row of rows) {
        grouped[wholeSaleToLabel(row.wholeSale)].push(row);
      }

      return grouped;
    },
  });
}


export function useAllPrices() {
  return useQuery({
    queryKey: productPriceKeys.all,
    queryFn: async () => {
      const rows = await db.query.productPrices.findMany({
        orderBy: (p) => p.createdAt,
        with: { product: true },
      });
return rows;
    },
  });
}
/** The global default price row */
export function useDefaultProductPrice() {
  return useQuery({
    queryKey: productPriceKeys.default(),
    queryFn: async () => {
      const row = await db.query.productPrices.findFirst({
        where: eq(productPrices.isDefault, true),
      });
      return row ?? null;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* MUTATIONS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Upsert a price row for a product + label.
 * Accepts `label: PriceLabel` for convenience — converts to `wholeSale` boolean internally.
 */
export function useUpsertProductPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<NewProductPrice, "wholeSale"> & { label: PriceLabel },
    ) => {
      const { label, ...rest } = data;
      const wholeSale = labelToWholeSale(label);

      if (rest.isDefault) {
        await db.update(productPrices).set({ isDefault: false });
      }

      const existing = await db.query.productPrices.findFirst({
        where: and(
          eq(productPrices.productId, rest.productId),
          eq(productPrices.wholeSale, wholeSale),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(productPrices)
          .set({ ...rest, wholeSale, id: existing.id, updatedAt: new Date() })
          .where(eq(productPrices.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(productPrices)
        .values({ ...rest, wholeSale, id: rest.id ?? nanoid() })
        .returning();
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productPriceKeys.all });
    },
  });
}

/** Delete a price entry for a specific product + label */
export function useDeleteProductPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      label,
    }: {
      productId: string;
      label: PriceLabel;
    }) => {
      await db
        .delete(productPrices)
        .where(
          and(
            eq(productPrices.productId, productId),
            eq(productPrices.wholeSale, labelToWholeSale(label)),
          ),
        );
      return { productId, label };
    },
    onSuccess: ({ productId, label }) => {
      qc.invalidateQueries({ queryKey: productPriceKeys.byProduct(productId) });
      qc.invalidateQueries({ queryKey: productPriceKeys.byLabel(label) });
    },
  });
}

/**
 * Bulk-adjust all prices under a label.
 * mode: "percent" → multiply, "fixed" → add delta, "set" → exact value
 */
export function useBulkAdjustPricesByLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      label,
      mode,
      delta,
    }: {
      label: PriceLabel;
      mode: "percent" | "fixed" | "set";
      delta: number;
    }) => {
      const rows = await db.query.productPrices.findMany({
        where: eq(productPrices.wholeSale, labelToWholeSale(label)),
      });

      await Promise.all(
        rows.map((row) => {
          let newSalePrice: number;
          if (mode === "percent")
            newSalePrice = row.salePrice * (1 + delta / 100);
          else if (mode === "fixed") newSalePrice = row.salePrice + delta;
          else newSalePrice = delta;

          newSalePrice = Math.max(0, parseFloat(newSalePrice.toFixed(4)));
          const newMarkup =
            row.cost > 0 ? ((newSalePrice - row.cost) / row.cost) * 100 : 0;

          return db
            .update(productPrices)
            .set({
              salePrice: newSalePrice,
              markup: parseFloat(newMarkup.toFixed(2)),
              updatedAt: new Date(),
            })
            .where(eq(productPrices.id, row.id));
        }),
      );
    },
    onSuccess: (_, { label }) => {
      qc.invalidateQueries({ queryKey: productPriceKeys.byLabel(label) });
      qc.invalidateQueries({ queryKey: productPriceKeys.all });
    },
  });
}
