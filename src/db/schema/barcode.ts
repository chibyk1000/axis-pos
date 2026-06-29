import {
  sqliteTable,
  text,
  integer,
  foreignKey,
  index,
} from "drizzle-orm/sqlite-core";


import { InferInsertModel, relations } from "drizzle-orm";
import { products } from "./products";

export const barcodes = sqliteTable(
  "barcodes",
  {
    id: text("id").primaryKey(),

    // e.g. EAN-13, UPC-A, CODE-128, QR
    type: text("type").$type<"EAN13" | "UPC" | "CODE128" | "QR">().notNull(),

    value: text("value").notNull().unique(),

    productId: text("product_id").notNull(),

    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "barcodes_product_fk",
    }).onDelete("cascade"),
    // PERF: barcode scanning in the POS looks up by `value` (already unique
    // and indexed), but "give me all barcodes for this product" — used
    // every time products load with relations — had no index on productId.
    productIdIdx: index("barcodes_product_id_idx").on(table.productId),
  }),
);

export const barcodesRelations = relations(barcodes, ({ one }) => ({
  product: one(products, {
    fields: [barcodes.productId],
    references: [products.id],
  }),
}));

export type Barcode  = InferInsertModel<typeof barcodes> ;