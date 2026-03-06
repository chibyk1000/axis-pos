import {  real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { documents } from "./documents";

export const documentItems = sqliteTable("document_items", {
  id: text("id").primaryKey(),

  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),

  productId: text("product_id").notNull(),

  name: text("name").notNull(),
  unit: text("unit"),

  quantity: real("quantity").notNull(),
  priceBeforeTax: real("price_before_tax").notNull(),
  taxRate: real("tax_rate").default(0),
  discount: real("discount").default(0),

  total: real("total").notNull(),
});