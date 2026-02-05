import { InferInsertModel, InferSelectModel, relations, } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { products } from "./products";

export const nodes = sqliteTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    displayName: text("display_name"),
    type: text("type").$type<"group" | "product">().notNull(),
    parentId: text("parent_id"),
    image: text("image"),
    color: text("color"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    parentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "nodes_parent_fk",
    }).onDelete("cascade"),
  }),
);


export const nodesRelations = relations(nodes, ({ one, many }) => ({
  parent: one(nodes, {
    fields: [nodes.parentId],
    references: [nodes.id],
    relationName: "node_tree",
  }),
  children: many(nodes, {
    relationName: "node_tree",
  }),
  products: many(products),
}));

export type Node = InferSelectModel<typeof nodes>;
export type NewNode = InferInsertModel<typeof nodes>;