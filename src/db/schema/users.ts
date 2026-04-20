import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { companies } from "./company";
import { products } from "./products";
import { documents } from "./documents";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey().unique(),
  name: text("name"),
  email: text("email").unique(),
  passwordHash: text("password_hash"), // store bcrypt/argon2 hash, never plaintext
  accessLevel: integer("access_level").notNull().default(1), // 0-9, matches security tab
  age: integer("age").default(18),
  city: text("city").default("NULL"),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
  updated_at: text("updated_at").default("CURRENT_TIMESTAMP"),
  deleted_at: text("deleted_at").default("NULL"), // soft-delete
  companyId: text("company_id").references(() => companies.id),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  products: many(products),
  documents: many(documents),
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
