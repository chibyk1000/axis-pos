// db/schema/paymentTypes.ts
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const paymentTypes = sqliteTable("payment_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  code: text("code").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  quickPayment: integer("quick_payment", { mode: "boolean" })
    .notNull()
    .default(false),
  customerRequired: integer("customer_required", { mode: "boolean" })
    .notNull()
    .default(false),
  changeAllowed: integer("change_allowed", { mode: "boolean" })
    .notNull()
    .default(false),
  markTransactionAsPaid: integer("mark_transaction_as_paid", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  printReceipt: integer("print_receipt", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

export type PaymentType = InferSelectModel<typeof paymentTypes>;
export type NewPaymentType = InferInsertModel<typeof paymentTypes>;