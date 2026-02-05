import {
  sqliteTable,
  text,
  integer,
  real,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";


export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  taxNumber: text("tax_number"),
  streetName: text("street_name"),
  buildingNumber: text("building_number"),
  additionalStreetName: text("additional_street_name"),
  plotIdentification: text("plot_identification"),
  district: text("district"),
  postalCode: text("postal_code"),
  city: text("city"),
  stateProvince: text("state_province"),
  country: text("country"),

  phoneNumber: text("phone_number"),
  email: text("email"),

  active: integer("active", { mode: "boolean" }).notNull().default(true),
  customer: integer("customer", { mode: "boolean" }).notNull().default(true),

  paymentTermsDays: integer("payment_terms_days"), // 7, 14, 30

  taxExempt: integer("tax_exempt", { mode: "boolean" })
    .notNull()
    .default(false),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});




export const loyaltyCards = sqliteTable(
  "loyalty_cards",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    number: text("number").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    customerFk: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "loyalty_cards_customer_fk",
    }).onDelete("cascade"),
  }),
);

/* ---------- Customer Discounts (many-to-many with products) ---------- */
export const customerDiscounts = sqliteTable(
  "customer_discounts",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    productId: text("product_id").notNull(),
    discountPercent: real("discount_percent").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    customerFk: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "customer_discounts_customer_fk",
    }).onDelete("cascade"),

    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "customer_discounts_product_fk",
    }).onDelete("cascade"),
  }),
);

/* ---------- Relations ---------- */
export const customersRelations = relations(customers, ({ many }) => ({
  loyaltyCards: many(loyaltyCards),
  discounts: many(customerDiscounts),
}));

export const loyaltyCardsRelations = relations(loyaltyCards, ({ one }) => ({
  customer: one(customers, {
    fields: [loyaltyCards.customerId],
    references: [customers.id],
  }),
}));



export const customerDiscountsRelations = relations(
  customerDiscounts,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerDiscounts.customerId],
      references: [customers.id],
    }),
    product: one(products, {
      fields: [customerDiscounts.productId],
      references: [products.id],
    }),
  }),
);

export type Customer = InferSelectModel<typeof customers>;
export type NewCustomer = InferInsertModel<typeof customers>;

export type LoyaltyCard = InferSelectModel<typeof loyaltyCards>;
export type NewLoyaltyCard = InferInsertModel<typeof loyaltyCards>;

export type CustomerDiscount = InferSelectModel<typeof customerDiscounts>;
export type NewCustomerDiscount = InferInsertModel<typeof customerDiscounts>;