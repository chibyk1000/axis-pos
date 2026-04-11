import {
  sqliteTable,
  text,
  integer,
  real,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products";

/* -------------------------------------------------------------------------- */
/*  PRODUCT PRICES — multiple prices per product (simple)                     */
/* -------------------------------------------------------------------------- */

export const productPrices = sqliteTable(
  "product_prices",
  {
    id: text("id").primaryKey(),

   productId: text("product_id")
  .notNull()
  .references(() => products.id, { onDelete: "cascade" }),

   
wholeSale: integer("wholesale", { mode: "boolean" }).notNull().default(false),
    cost: real("cost").notNull().default(0),
    markup: real("markup").notNull().default(0),
    salePrice: real("sale_price").notNull().default(0),

    priceAfterTax: integer("price_after_tax", { mode: "boolean" })
      .notNull()
      .default(false),

    priceChangeAllowed: integer("price_change_allowed", { mode: "boolean" })
      .notNull()
      .default(false),

    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),

    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "product_prices_product_fk",
    }).onDelete("cascade"),
  }),
);
export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}));

export type ProductPrice = InferSelectModel<typeof productPrices>;
export type NewProductPrice = InferInsertModel<typeof productPrices>;