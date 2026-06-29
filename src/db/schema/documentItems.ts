import { real, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { documents } from "./documents";
import { products } from "./products";

export const documentItems = sqliteTable(
  "document_items",
  {
    id: text("id").primaryKey(),

    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    productId: text("product_id")
      .notNull()
      .references(() => products.id),

    name: text("name").notNull(),
    unit: text("unit"),

    quantity: real("quantity").notNull(),
    priceBeforeTax: real("price_before_tax").notNull(),
    taxRate: real("tax_rate").default(0),
    discount: real("discount").default(0),

    total: real("total").notNull(),
  },
  (table) => ({
    // PERF: every order lookup joins on documentId, and dashboard top-products
    // / top-groups queries group/join on productId — both were unindexed.
    documentIdIdx: index("document_items_document_id_idx").on(
      table.documentId,
    ),
    productIdIdx: index("document_items_product_id_idx").on(table.productId),
  }),
);
