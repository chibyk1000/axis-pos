import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations, InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "./users";

export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),

    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Snapshot of the actor's name at the time of the action, so history
    // still reads correctly after a user is renamed or deactivated.
    userName: text("user_name"),

    // e.g. "product.create", "sale.create", "user.delete"
    action: text("action").notNull(),
    // e.g. "product", "document", "user", "stock"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),

    description: text("description").notNull(),
    // Optional JSON blob with extra detail (changed fields, amounts, etc.)
    metadata: text("metadata"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("activity_logs_user_id_idx").on(table.userId),
    entityIdx: index("activity_logs_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  }),
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type ActivityLog = InferSelectModel<typeof activityLogs>;
export type NewActivityLog = InferInsertModel<typeof activityLogs>;
