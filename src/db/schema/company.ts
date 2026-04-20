import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "./users";
import { products } from "./products";

/* -------------------------------------------------------------------------- */
/*                               COMPANIES                                    */
/* -------------------------------------------------------------------------- */

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  taxNumber: text("tax_number"),
  streetName: text("street_name"),
  buildingNumber: text("building_number"),
  additionalStreetName: text("additional_street_name"),
  plotIdentification: text("plot_identification"),
  district: text("district"),
  postalCode: text("postal_code"),
  city: text("city"),
  stateProvince: text("state_province"),
  countryCode: text("country_code"), // FK → countries.code
  phone: text("phone"),
  email: text("email"),
  bankAccountNumber: text("bank_account_number"),
  bankDetails: text("bank_details"),
  logoPath: text("logo_path"), // local file path / data-url
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

/* -------------------------------------------------------------------------- */
/*                              VOID REASONS                                  */
/* -------------------------------------------------------------------------- */

export const voidReasons = sqliteTable("void_reasons", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  position: integer("position").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                               RELATIONS                                    */
/* -------------------------------------------------------------------------- */

export const companiesRelations = relations(companies, ({ many }) => ({
  voidReasons: many(voidReasons),
  users: many(users),
  products: many(products),
}));

export const voidReasonsRelations = relations(voidReasons, ({ one }) => ({
  company: one(companies, {
    fields: [voidReasons.companyId],
    references: [companies.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                                 TYPES                                      */
/* -------------------------------------------------------------------------- */

export type Company = InferSelectModel<typeof companies>;
export type NewCompany = InferInsertModel<typeof companies>;

export type VoidReason = InferSelectModel<typeof voidReasons>;
export type NewVoidReason = InferInsertModel<typeof voidReasons>;

export type CompanyWithRelations = Company & {
  voidReasons: VoidReason[];
};
