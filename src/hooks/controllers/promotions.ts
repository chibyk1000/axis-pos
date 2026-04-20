import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";
import {
  promotions,
  promotionProducts,
  promotionNodes,
  promotionCustomers,
  promotionBogo,
} from "@/db/schema";
import type {
  PromotionWithRelations,
  NewPromotion,
  Promotion,
} from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*                                    KEYS                                    */
/* -------------------------------------------------------------------------- */

export const promotionKeys = {
  all: ["promotions"] as const,
  list: () => [...promotionKeys.all, "list"] as const,
  active: () => [...promotionKeys.all, "active"] as const,
  byId: (id: string) => [...promotionKeys.all, "byId", id] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/** Fetch a promotion with all its relations */
async function fetchPromotionById(id: string): Promise<PromotionWithRelations> {
  const promo = await db.query.promotions.findFirst({
    where: eq(promotions.id, id),
    with: {
      products: true,
      nodes: true,
      customers: true,
      bogo: true,
    },
  });
  if (!promo) throw new Error("Promotion not found");
  return promo as PromotionWithRelations;
}

/* -------------------------------------------------------------------------- */
/*                                  QUERIES                                   */
/* -------------------------------------------------------------------------- */

/** All promotions with relations */
export function usePromotions() {
  return useQuery({
    queryKey: promotionKeys.list(),
    queryFn: async () =>
      db.query.promotions.findMany({
        orderBy: (p) => p.createdAt,
        with: {
          products: true,
          nodes: true,
          customers: true,
          bogo: true,
        },
      }) as Promise<PromotionWithRelations[]>,
  });
}

/** Only currently active promotions — used by the POS engine */
export function useActivePromotions() {
  return useQuery({
    queryKey: promotionKeys.active(),
    queryFn: async () => {
      const now = new Date();
      return db.query.promotions.findMany({
        where: and(
          eq(promotions.enabled, true),
          or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
          or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
        ),
        with: {
          products: true,
          nodes: true,
          customers: true,
          bogo: true,
        },
      }) as Promise<PromotionWithRelations[]>;
    },
  });
}

/** Single promotion by id */
export function usePromotionById(id: string) {
  return useQuery({
    queryKey: promotionKeys.byId(id),
    enabled: !!id,
    queryFn: () => fetchPromotionById(id),
  });
}

/* -------------------------------------------------------------------------- */
/*                                 MUTATIONS                                  */
/* -------------------------------------------------------------------------- */

export type CreatePromotionPayload = NewPromotion & {
  productIds?: string[];
  nodeIds?: string[];
  customerIds?: string[];
  bogo?: {
    buyProductId: string;
    buyQuantity: number;
    getProductId: string;
    getQuantity: number;
  };
};

/** Create a promotion + all its relations in one shot */
export function useCreatePromotion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePromotionPayload) => {
      const {
        productIds = [],
        nodeIds = [],
        customerIds = [],
        bogo,
        ...promoData
      } = payload;

      const id = promoData.id ?? crypto.randomUUID();
      await db.insert(promotions).values({ ...promoData, id });
      const created = { ...promoData, id } as Promotion;

      if (productIds.length) {
        await db.insert(promotionProducts).values(
          productIds.map((productId) => ({
            promotionId: created.id,
            productId,
          })),
        );
      }

      if (nodeIds.length) {
        await db
          .insert(promotionNodes)
          .values(
            nodeIds.map((nodeId) => ({ promotionId: created.id, nodeId })),
          );
      }

      if (customerIds.length) {
        await db.insert(promotionCustomers).values(
          customerIds.map((customerId) => ({
            promotionId: created.id,
            customerId,
          })),
        );
      }

      if (bogo) {
        const bogoId = crypto.randomUUID();
        await db
          .insert(promotionBogo)
          .values({ id: bogoId, promotionId: created.id, ...bogo });
      }

      return fetchPromotionById(created.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionKeys.list() });
      qc.invalidateQueries({ queryKey: promotionKeys.active() });
    },
  });
}

export type UpdatePromotionPayload = {
  id: string;
  data: Partial<Omit<Promotion, "id" | "createdAt" | "usedCount">>;
  productIds?: string[];
  nodeIds?: string[];
  customerIds?: string[];
  bogo?: {
    buyProductId: string;
    buyQuantity: number;
    getProductId: string;
    getQuantity: number;
  } | null;
};

/** Update a promotion and replace its relations */
export function useUpdatePromotion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      productIds,
      nodeIds,
      customerIds,
      bogo,
    }: UpdatePromotionPayload) => {
      const existing = await db.query.promotions.findFirst({
        where: eq(promotions.id, id),
      });
      if (!existing) throw new Error("Promotion not found");

      await db.update(promotions).set(data).where(eq(promotions.id, id));

      // Replace junction rows only when the caller explicitly passes arrays
      if (productIds !== undefined) {
        await db
          .delete(promotionProducts)
          .where(eq(promotionProducts.promotionId, id));
        if (productIds.length) {
          await db
            .insert(promotionProducts)
            .values(
              productIds.map((productId) => ({ promotionId: id, productId })),
            );
        }
      }

      if (nodeIds !== undefined) {
        await db
          .delete(promotionNodes)
          .where(eq(promotionNodes.promotionId, id));
        if (nodeIds.length) {
          await db
            .insert(promotionNodes)
            .values(nodeIds.map((nodeId) => ({ promotionId: id, nodeId })));
        }
      }

      if (customerIds !== undefined) {
        await db
          .delete(promotionCustomers)
          .where(eq(promotionCustomers.promotionId, id));
        if (customerIds.length) {
          await db.insert(promotionCustomers).values(
            customerIds.map((customerId) => ({
              promotionId: id,
              customerId,
            })),
          );
        }
      }

      if (bogo !== undefined) {
        await db.delete(promotionBogo).where(eq(promotionBogo.promotionId, id));
        if (bogo) {
          await db.insert(promotionBogo).values({
            id: crypto.randomUUID(),
            promotionId: id,
            ...bogo,
          });
        }
      }

      return fetchPromotionById(id);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: promotionKeys.byId(id) });
      qc.invalidateQueries({ queryKey: promotionKeys.list() });
      qc.invalidateQueries({ queryKey: promotionKeys.active() });
    },
  });
}

/** Toggle enabled on/off */
export function useTogglePromotion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await db.update(promotions).set({ enabled }).where(eq(promotions.id, id));
      const updated = await fetchPromotionById(id);
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: promotionKeys.byId(id) });
      qc.invalidateQueries({ queryKey: promotionKeys.list() });
      qc.invalidateQueries({ queryKey: promotionKeys.active() });
    },
  });
}

/** Delete a promotion (cascade handles junction rows) */
export function useDeletePromotion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await db.query.promotions.findFirst({
        where: eq(promotions.id, id),
      });
      if (!existing) throw new Error("Promotion not found");
      await db.delete(promotions).where(eq(promotions.id, id));
      return existing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionKeys.list() });
      qc.invalidateQueries({ queryKey: promotionKeys.active() });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                              POS ENGINE HOOK                               */
/* -------------------------------------------------------------------------- */

export type CartItem = {
  productId: string;
  nodeId: string;
  quantity: number;
  unitPrice: number;
};

export type AppliedPromotion = {
  promotionId: string;
  name: string;
  type: Promotion["type"];
  discountAmount: number;
  affectedProductIds: string[];
};

/**
 * applyPromotions — pure function you can call inside your POS checkout logic.
 *
 * Returns the list of promotions that fired and the total discount amount.
 */
export function applyPromotions(
  cart: CartItem[],
  activePromotions: PromotionWithRelations[],
  customerId?: string,
): { applied: AppliedPromotion[]; totalDiscount: number } {
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const applied: AppliedPromotion[] = [];

  for (const promo of activePromotions) {
    // Check usage cap
    if (
      promo.maxUses !== null &&
      promo.usedCount >= (promo.maxUses ?? Infinity)
    )
      continue;

    // Check customer restriction — if any customers are listed, only they qualify
    if (promo.customers.length > 0) {
      if (
        !customerId ||
        !promo.customers.some((c) => c.customerId === customerId)
      )
        continue;
    }

    // Check min order value
    if (promo.minOrderValue !== null && cartTotal < (promo.minOrderValue ?? 0))
      continue;

    if (promo.type === "spend_discount") {
      // Applies to whole cart when spend threshold is met
      const discount = promo.value ?? 0;
      applied.push({
        promotionId: promo.id,
        name: promo.name,
        type: promo.type,
        discountAmount:
          promo.type === "spend_discount"
            ? discount
            : (cartTotal * discount) / 100,
        affectedProductIds: cart.map((i) => i.productId),
      });
      continue;
    }

    if (promo.type === "bogo" && promo.bogo) {
      const { buyProductId, buyQuantity, getProductId, getQuantity } =
        promo.bogo;
      const buyItem = cart.find((i) => i.productId === buyProductId);
      const getItem = cart.find((i) => i.productId === getProductId);
      if (!buyItem || !getItem) continue;
      if (buyItem.quantity < buyQuantity) continue;

      const freeSets = Math.floor(buyItem.quantity / buyQuantity);
      const freeUnits = Math.min(freeSets * getQuantity, getItem.quantity);
      const discount = freeUnits * getItem.unitPrice;

      applied.push({
        promotionId: promo.id,
        name: promo.name,
        type: "bogo",
        discountAmount: discount,
        affectedProductIds: [buyProductId, getProductId],
      });
      continue;
    }

    // "percent" | "fixed" scoped to product / node / cart
    const eligibleItems = cart.filter((item) => {
      if (promo.scope === "cart") return true;
      if (promo.scope === "product")
        return promo.products.some((p) => p.productId === item.productId);
      if (promo.scope === "node")
        return promo.nodes.some((n) => n.nodeId === item.nodeId);
      return false;
    });

    if (eligibleItems.length === 0) continue;

    // Check min quantity across eligible items
    const eligibleQty = eligibleItems.reduce((s, i) => s + i.quantity, 0);
    if (promo.minQuantity !== null && eligibleQty < (promo.minQuantity ?? 0))
      continue;

    const eligibleTotal = eligibleItems.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0,
    );
    const discount =
      promo.type === "percent"
        ? (eligibleTotal * (promo.value ?? 0)) / 100
        : (promo.value ?? 0);

    applied.push({
      promotionId: promo.id,
      name: promo.name,
      type: promo.type,
      discountAmount: Math.min(discount, eligibleTotal),
      affectedProductIds: eligibleItems.map((i) => i.productId),
    });
  }

  const totalDiscount = applied.reduce((s, p) => s + p.discountAmount, 0);
  return { applied, totalDiscount };
}
