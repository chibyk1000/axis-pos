import {
  sqliteTable,
  text,
  integer,
  foreignKey,
} from "drizzle-orm/sqlite-core";

import { products } from "./products";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
/* ---------- Comments ---------- */
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    authorId: text("author_id"),
    content: text("content").notNull(),
    parentId: text("parent_id"),
    isEdited: integer("is_edited", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    productFk: foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "comments_product_fk",
    }).onDelete("cascade"),

    parentCommentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "comments_parent_fk",
    }).onDelete("cascade"),
  }),
);

export const commentsRelations = relations(comments, ({  one }) => ({
  product: one(products, {
    fields: [comments.productId],
    references: [products.id],
  }),
  // replies: many(comments, {
  //   fields: [comments.id],
  //   references: [comments.parentId],
  // }),
}));

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;