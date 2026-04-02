import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

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
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
