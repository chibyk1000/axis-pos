import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products";
import { customers } from "./customers";

export const stockEntries = sqliteTable(
  "stock_entries",
  {
    id: text("id").primaryKey(),

    productId: text("product_id")
      .notNull()
      .unique() // ← one row per product
      .references(() => products.id, { onDelete: "cascade" }),

    type: text("type")
      .$type<"in" | "out" | "adjustment">()
      .notNull()
      .default("in"),

    quantity: real("quantity").notNull(),

    note: text("note"),
    supplierId: text("supplier_id").references(() => customers.id, {
      onDelete: "restrict",
    }),

    reorderPoint: real("reorder_point"),
    preferredQuantity: real("preferred_quantity"),

    lowStockWarning: integer("low_stock_warning", {
      mode: "boolean",
    })
      .notNull()
      .default(false),

    lowStockWarningQuantity: real("low_stock_warning_quantity").default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productIdIdx: uniqueIndex("stock_entries_product_id_idx").on(
      table.productId,
    ),
  }),
);

export const stockEntriesRelations = relations(stockEntries, ({ one }) => ({
  product: one(products, {
    fields: [stockEntries.productId],
    references: [products.id],
  }),
  supplier: one(customers, {
    fields: [stockEntries.supplierId],
    references: [customers.id],
  }),
}));

export type StockEntry = InferSelectModel<typeof stockEntries>;
export type NewStockEntry = InferInsertModel<typeof stockEntries>;
