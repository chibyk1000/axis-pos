// hooks/nodes/queryKeys.ts
export const nodeKeys = {
  all: ["nodes"] as const,
  root: ["nodes", "root"] as const,
  children: (parentId: string | null) =>
    ["nodes", "children", parentId] as const,
  byId: (id: string) => ["nodes", "id", id] as const,
};
