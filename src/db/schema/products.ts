import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nodes } from "./nodes";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { barcodes } from "./barcode";
import { productTaxes } from "./productTaxes";
import { comments } from "./comments";
import { customers } from "./customers";
import { taxes } from "./taxes";
import { stockEntries } from "./stockEntries";
import { productPrices } from "./priceLists";

// ─── products table ───────────────────────────────────────────────────────────
// Pricing / stock-control fields have been moved:
//   cost, markup, salePrice, priceAfterTax, priceChangeAllowed
//     → priceListItems (db/schema/priceLists.ts)
//   reorderPoint, preferredQuantity, lowStockWarning, lowStockWarningQuantity
//     → stockEntries   (db/schema/stockEntries.ts)

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),

  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),

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
  node: one(nodes, { fields: [products.nodeId], references: [nodes.id] }),
  comments: many(comments),
  prices: many(productPrices),
  stockEntries: many(stockEntries),
  supplier: one(customers, {
    fields: [products.supplierId],
    references: [customers.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = InferSelectModel<typeof products> & {
  barcodes: InferSelectModel<typeof barcodes>[];
  taxes: {
    productId: string;
    taxId: string;
    tax: InferSelectModel<typeof taxes>;
  }[];
  comments: InferSelectModel<typeof comments>[];
  stockEntries: InferSelectModel<typeof stockEntries>[];
  node: InferSelectModel<typeof nodes>;
  supplier?: InferSelectModel<typeof customers> | null;
};

export type NewProduct = InferInsertModel<typeof products>;
