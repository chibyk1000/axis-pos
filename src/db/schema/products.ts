import {
  sqliteTable,
  text,
  integer,
  real,
 
} from "drizzle-orm/sqlite-core";
import { nodes } from "./nodes";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { barcodes } from "./barcode";

import { productTaxes } from "./productTaxes";
import { comments } from "./comments";
import { customers } from "./customers";
import { taxes } from "./taxes";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), // ← product identity

  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, {
      onDelete: "cascade",
    }),

  supplierId: text("supplier_id").references(() => customers.id, {
    onDelete: "restrict",
  }),

  title: text("title").notNull(),
  code: text("code").notNull(),
  unit: text("unit").notNull(),

  active: integer("active", { mode: "boolean" }).notNull().default(false),
  service: integer("service", { mode: "boolean" }).notNull().default(false),
  defaultQuantity: integer("default_quantity", { mode: "boolean" })
    .notNull()
    .default(false),

  ageRestriction: integer("age_restriction"),

  cost: real("cost").notNull().default(0),
  markup: real("markup").notNull().default(0),
  salePrice: real("sale_price").notNull().default(0),

  priceAfterTax: integer("price_after_tax", { mode: "boolean" })
    .notNull()
    .default(false),

  priceChangeAllowed: integer("price_change_allowed", {
    mode: "boolean",
  })
    .notNull()
    .default(false),

  reorderPoint: real("reorder_point"),
  preferredQuantity: real("preferred_quantity"),

  lowStockWarning: integer("low_stock_warning", {
    mode: "boolean",
  })
    .notNull()
    .default(false),

  lowStockWarningQuantity: real("low_stock_warning_quantity").default(0),

  description: text("description"),
  image: text("image"),
  color: text("color"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});


export const productsRelations = relations(products, ({ many, one }) => ({
  barcodes: many(barcodes),
  taxes: many(productTaxes),
  node: one(nodes, {
    fields: [products.nodeId],
    references: [nodes.id],
  }),
  comments: many(comments),
}));

export type Product = InferSelectModel<typeof products> & {
  barcodes: InferSelectModel<typeof barcodes>[];
  taxes: {
    productId: string;
    taxId: string;
    tax: InferSelectModel<typeof taxes>;
  }[];
  comments: InferSelectModel<typeof comments>[];

  node: InferSelectModel<typeof nodes>;
  supplier?: InferSelectModel<typeof customers> | null;
};

export type NewProduct = InferInsertModel<typeof products>;