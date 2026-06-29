import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products";
import { documents } from "./documents";

export const stockLogs = sqliteTable(
  "stock_logs",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    documentId: text("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),

    type: text("type").$type<"in" | "out" | "adjustment">().notNull(),

    quantity: real("quantity").notNull(),
    note: text("note"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // PERF: useProductStockLogs filters by productId, useStockLogs orders the
    // whole table by createdAt — both unindexed before.
    productIdIdx: index("stock_logs_product_id_idx").on(table.productId),
    documentIdIdx: index("stock_logs_document_id_idx").on(table.documentId),
  }),
);

export const stockLogsRelations = relations(stockLogs, ({ one }) => ({
  product: one(products, {
    fields: [stockLogs.productId],
    references: [products.id],
  }),
  document: one(documents, {
    fields: [stockLogs.documentId],
    references: [documents.id],
  }),
}));

export type StockLog = InferSelectModel<typeof stockLogs>;
export type NewStockLog = InferInsertModel<typeof stockLogs>;
