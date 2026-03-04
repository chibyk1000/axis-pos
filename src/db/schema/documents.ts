import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

import { customers } from ".";
import { paymentTypes } from "./paymentTypes";
import { documentItems } from "./documentItems";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),

  number: text("number").notNull(),
  externalNumber: text("external_number"),

  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),

  date: integer("date", { mode: "timestamp" }).notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }),
  stockDate: integer("stock_date", { mode: "timestamp" }),

  paid: integer("paid", { mode: "boolean" }).default(false),

  status: text("status")
    .$type<"draft" | "posted" | "cancelled">()
    .default("draft"),

  totalBeforeTax: real("total_before_tax").default(0),
  taxTotal: real("tax_total").default(0),
  total: real("total").default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const documentPayments = sqliteTable("docmentPayments", {
  id: text("id").primaryKey(),

  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  paymentId: text("payment_id")
    .notNull()
    .references(() => paymentTypes.id, { onDelete: "cascade" }),

  status: text("status")
    .$type<"pending" | "paid" | "failed">()
    .default("pending"),

  paymentType: text("payment_type"),

  amount: real("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
});

export const documentRelations = relations(documents, ({ many, one }) => ({
  items: many(documentItems),
  payments: many(documentPayments),
  customer: one(customers, {
    fields: [documents.customerId],
    references: [customers.id],
  }),
}));