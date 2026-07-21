import { db } from "@/db/database";
import { activityLogs } from "@/db/schema";
import { getCurrentUser } from "@/providers/auth-provider";
import { nanoid } from "nanoid";

export type ActivityAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "document.create"
  | "document.update"
  | "document.delete"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "stock.in"
  | "stock.out"
  | "stock.adjustment"
  | "stock.delete";

export type ActivityEntityType =
  | "product"
  | "document"
  | "user"
  | "stock";

type LogActivityInput = {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an audit-trail entry for an admin-facing action (who added a
 * product, who made a sale, who edited a user, etc). Never throws — a
 * logging failure should never block the actual mutation it's describing.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    const user = getCurrentUser();
    await db.insert(activityLogs).values({
      id: nanoid(),
      userId: user?.id ?? null,
      userName: user?.username ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}
