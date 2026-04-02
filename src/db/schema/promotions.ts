import {
  sqliteTable,
  text,
  integer,
  real,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products";
import { nodes } from "./nodes";
import { customers } from "./customers";

// ─── Core promotions table ────────────────────────────────────────────────────

export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  // What kind of discount this is
  type: text("type")
    .$type<"percent" | "fixed" | "bogo" | "spend_discount">()
    .notNull(),

  // What it applies to (product-level or whole cart)
  scope: text("scope").$type<"product" | "node" | "cart">().notNull(),

  // Discount value — percent (0-100) for "percent", absolute amount for "fixed"/"spend_discount"
  // Null for "bogo" (the bogo table defines it)
  value: real("value"),

  // Conditions
  minOrderValue: real("min_order_value"),
  minQuantity: integer("min_quantity"),

  // Usage cap (null = unlimited)
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),

  // Scheduling
  startsAt: integer("starts_at", { mode: "timestamp" }),
  endsAt: integer("ends_at", { mode: "timestamp" }),

  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

// ─── BOGO config (only used when type = "bogo") ───────────────────────────────

export const promotionBogo = sqliteTable(
  "promotion_bogo",
  {
    id: text("id").primaryKey(),
    promotionId: text("promotion_id").notNull(),
    buyProductId: text("buy_product_id").notNull(),
    buyQuantity: integer("buy_quantity").notNull().default(1),
    getProductId: text("get_product_id").notNull(),
    getQuantity: integer("get_quantity").notNull().default(1),
  },
  (table) => ({
    promotionFk: foreignKey({
      columns: [table.promotionId],
      foreignColumns: [promotions.id],
      name: "bogo_promotion_fk",
    }).onDelete("cascade"),
    buyFk: foreignKey({
      columns: [table.buyProductId],
      foreignColumns: [products.id],
      name: "bogo_buy_product_fk",
    }).onDelete("cascade"),
    getFk: foreignKey({
      columns: [table.getProductId],
      foreignColumns: [products.id],
      name: "bogo_get_product_fk",
    }).onDelete("cascade"),
  }),
);

// ─── Junction: promotions ↔ specific products ─────────────────────────────────

export const promotionProducts = sqliteTable(
  "promotion_products",
  {
    promotionId: text("promotion_id").notNull(),
    productId: text("product_id").notNull(),
  },
  (table) => ({
    promotionFk: foreignKey({
      columns: [table.promotionId],
      foreignColumns: [promotions.id],
      name: "promo_products_promotion_fk",
    }).onDelete("cascade"),
    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "promo_products_product_fk",
    }).onDelete("cascade"),
  }),
);

// ─── Junction: promotions ↔ nodes/categories ─────────────────────────────────

export const promotionNodes = sqliteTable(
  "promotion_nodes",
  {
    promotionId: text("promotion_id").notNull(),
    nodeId: text("node_id").notNull(),
  },
  (table) => ({
    promotionFk: foreignKey({
      columns: [table.promotionId],
      foreignColumns: [promotions.id],
      name: "promo_nodes_promotion_fk",
    }).onDelete("cascade"),
    nodeFk: foreignKey({
      columns: [table.nodeId],
      foreignColumns: [nodes.id],
      name: "promo_nodes_node_fk",
    }).onDelete("cascade"),
  }),
);

// ─── Junction: promotions ↔ specific customers ───────────────────────────────

export const promotionCustomers = sqliteTable(
  "promotion_customers",
  {
    promotionId: text("promotion_id").notNull(),
    customerId: text("customer_id").notNull(),
  },
  (table) => ({
    promotionFk: foreignKey({
      columns: [table.promotionId],
      foreignColumns: [promotions.id],
      name: "promo_customers_promotion_fk",
    }).onDelete("cascade"),
    customerFk: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "promo_customers_customer_fk",
    }).onDelete("cascade"),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const promotionsRelations = relations(promotions, ({ many, one }) => ({
  products: many(promotionProducts),
  nodes: many(promotionNodes),
  customers: many(promotionCustomers),
  bogo: one(promotionBogo, {
    fields: [promotions.id],
    references: [promotionBogo.promotionId],
  }),
}));

export const promotionBogoRelations = relations(promotionBogo, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionBogo.promotionId],
    references: [promotions.id],
  }),
  buyProduct: one(products, {
    fields: [promotionBogo.buyProductId],
    references: [products.id],
  }),
  getProduct: one(products, {
    fields: [promotionBogo.getProductId],
    references: [products.id],
  }),
}));

export const promotionProductsRelations = relations(
  promotionProducts,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionProducts.promotionId],
      references: [promotions.id],
    }),
    product: one(products, {
      fields: [promotionProducts.productId],
      references: [products.id],
    }),
  }),
);

export const promotionNodesRelations = relations(promotionNodes, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionNodes.promotionId],
    references: [promotions.id],
  }),
  node: one(nodes, { fields: [promotionNodes.nodeId], references: [nodes.id] }),
}));

export const promotionCustomersRelations = relations(
  promotionCustomers,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionCustomers.promotionId],
      references: [promotions.id],
    }),
    customer: one(customers, {
      fields: [promotionCustomers.customerId],
      references: [customers.id],
    }),
  }),
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Promotion = InferSelectModel<typeof promotions>;
export type NewPromotion = InferInsertModel<typeof promotions>;

export type PromotionWithRelations = Promotion & {
  products: { productId: string }[];
  nodes: { nodeId: string }[];
  customers: { customerId: string }[];
  bogo: InferSelectModel<typeof promotionBogo> | null;
};
