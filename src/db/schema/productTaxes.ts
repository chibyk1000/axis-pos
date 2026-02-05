import { sqliteTable, text, foreignKey } from "drizzle-orm/sqlite-core";
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