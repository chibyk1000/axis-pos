import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/database";
import { activityLogs, users } from "@/db/schema";
import { and, count, desc, eq, gte, like, lte, or } from "drizzle-orm";
import type { ActivityLog } from "@/db/schema/activityLogs";

export type { ActivityLog };

export type ActivityLogFilters = {
  userId?: number | null;
  entityType?: string | null;
  search?: string;
  fromMs?: number | null;
  toMs?: number | null;
};

function activityLogFilterConditions(f: ActivityLogFilters) {
  const conds = [];
  if (f.userId != null) conds.push(eq(activityLogs.userId, f.userId));
  if (f.entityType) conds.push(eq(activityLogs.entityType, f.entityType));
  const s = f.search?.trim();
  if (s) {
    conds.push(
      or(
        like(activityLogs.description, `%${s}%`),
        like(activityLogs.action, `%${s}%`),
        like(activityLogs.userName, `%${s}%`),
      ),
    );
  }
  if (f.fromMs != null) conds.push(gte(activityLogs.createdAt, new Date(f.fromMs)));
  if (f.toMs != null) conds.push(lte(activityLogs.createdAt, new Date(f.toMs)));
  return conds;
}

export type ActivityLogRow = ActivityLog & { userDisplayName: string | null };

export function useActivityLogsPage(
  filters: ActivityLogFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["activity-logs", "page", JSON.stringify(filters), page, pageSize],
    queryFn: async (): Promise<ActivityLogRow[]> => {
      const conds = activityLogFilterConditions(filters);
      const rows = await db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          userName: activityLogs.userName,
          action: activityLogs.action,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          description: activityLogs.description,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt,
          userDisplayName: users.name,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(activityLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return rows as ActivityLogRow[];
    },
    placeholderData: (prev) => prev,
  });
}

export function useActivityLogsCount(filters: ActivityLogFilters) {
  return useQuery({
    queryKey: ["activity-logs", "count", JSON.stringify(filters)],
    queryFn: async (): Promise<number> => {
      const conds = activityLogFilterConditions(filters);
      const [row] = await db
        .select({ total: count(activityLogs.id) })
        .from(activityLogs)
        .where(conds.length ? and(...conds) : undefined);
      return row?.total ?? 0;
    },
  });
}
