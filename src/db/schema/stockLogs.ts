import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products";

export const stockLogs = sqliteTable(
  "stock_logs",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    type: text("type")
      .$type<"in" | "out" | "adjustment">()
      .notNull(),

    quantity: real("quantity").notNull(),
    note: text("note"),
    
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  }
);

export const stockLogsRelations = relations(stockLogs, ({ one }) => ({
  product: one(products, {
    fields: [stockLogs.productId],
    references: [products.id],
  }),
}));

export type StockLog = InferSelectModel<typeof stockLogs>;
export type NewStockLog = InferInsertModel<typeof stockLogs>;
