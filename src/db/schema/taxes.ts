import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const taxes = sqliteTable("taxes", {
  id: text("id").primaryKey(),

  name: text("name").notNull(), // e.g. "VAT", "Sales Tax"
  code: text("code").notNull().unique(), // e.g. "VAT", "GST"
  rate: real("rate").notNull(), // e.g. 7.5, 10, 20 (percent)
  fixed: integer("fixed", { mode: "boolean" }).notNull().default(false),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});
