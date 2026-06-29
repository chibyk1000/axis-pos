import {
  sqliteTable,
  text,
  foreignKey,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { taxes } from "./taxes";
import { relations } from "drizzle-orm";

export const productTaxes = sqliteTable(
  "product_taxes",
  {
    productId: text("product_id").notNull(),
    taxId: text("tax_id").notNull(),
  },
  (table) => ({
    // PERF: this junction table previously had NO primary key and NO index at
    // all — every lookup (e.g. "give me the taxes for this product", which
    // runs once per product every time products are loaded) was a full
    // table scan. A composite PK both enforces one-row-per-pair and gives
    // SQLite an index to seek into for productId lookups.
    pk: primaryKey({ columns: [table.productId, table.taxId] }),
    // Reverse lookup (taxes -> products using that tax) still needs its own index
    // since the composite PK above only optimizes lookups by productId first.
    taxIdIdx: index("product_taxes_tax_id_idx").on(table.taxId),

    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
    }).onDelete("cascade"),

    taxFk: foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxes.id],
    }).onDelete("cascade"),
  }),
);

export const productTaxesRelations = relations(productTaxes, ({ one }) => ({
  product: one(products, {
    fields: [productTaxes.productId],
    references: [products.id],
  }),
  tax: one(taxes, {
    fields: [productTaxes.taxId],
    references: [taxes.id],
  }),
}));