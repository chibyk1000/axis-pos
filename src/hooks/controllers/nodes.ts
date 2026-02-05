
import { db } from "@/db/database";
import { eq,  } from "drizzle-orm";
import { nodes } from "@/db/schema/nodes";
import type { Node, NewNode } from "@/db/schema/index";
import { ROOT_NODE_ID } from "@/db/constants";
// hooks/nodes/useRootNodes.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nodeKeys } from "../querykeys";



export function useRootNodes() {
  return useQuery({
    queryKey: nodeKeys.root,
    queryFn: async () => {
      // 1️⃣ Fetch all nodes from the database
      const allNodes = await db.query.nodes.findMany({
        orderBy: (nodes) => nodes.position, // keep ordering
      });

      // 2️⃣ Build tree recursively
      function buildTree(nodes:any, parentId: string | null = null) {
        return nodes
          .filter((n:any) => n.parentId === parentId)
          .map((n:any) => ({
            ...n,
            children: buildTree(nodes, n.id), // recursion for children
          }));
      }

      // 3️⃣ Return tree starting from root nodes
      return buildTree(allNodes);
    },
  });
}
export function useRootWithoutChildren() {
  return useQuery({
    queryKey: ["root-nochild"],
    queryFn: async () =>{

const allNodes = await db.query.nodes.findMany({
  orderBy: (nodes) => nodes.position, // keep ordering
});
    return allNodes  
    }
  });
}





export function useNodeChildren(parentId: string | null) {
  return useQuery({
    queryKey: nodeKeys.children(parentId),
    queryFn: async () =>
      db.query.nodes.findMany({
        where:
          parentId === null
            ? (nodes, { isNull }) => isNull(nodes.parentId)
            : eq(nodes.parentId, parentId),
        orderBy: (nodes) => nodes.position,
      }),
  });
}



export function useNodeById(id: string) {
  return useQuery({
    queryKey: nodeKeys.byId(id),
    queryFn: async () => {
      const node = await db.query.nodes.findFirst({
        where: eq(nodes.id, id),
      });
      if (!node) throw new Error("Node not found");
      return node;
    },
  });
}




export function useCreateNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewNode) => {
      const [created] = await db.insert(nodes).values(data).returning();
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nodeKeys.all });
      qc.invalidateQueries({ queryKey: ["root-nochild"] });
      qc.invalidateQueries()
    },
  });
}



export function useUpdateNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Node, "id" | "createdAt">>;
    }) => {
    await db
        .update(nodes)
        .set(data)
        .where(eq(nodes.id, id))
        .returning();

      
      return true;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: nodeKeys.byId(id) });
      qc.invalidateQueries({ queryKey: nodeKeys.all });
    },
  });
}



export function useMoveNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      parentId,
      position,
    }: {
      id: string;
      parentId: string | null;
      position?: number;
    }) => {
      const [updated] = await db
        .update(nodes)
        .set({ parentId, position })
        .where(eq(nodes.id, id))
        .returning();

      if (!updated) throw new Error("Node not found");
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nodeKeys.all });
    },
  });
}





export function useDeleteNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .delete(nodes)
        .where(eq(nodes.id, id))
        .returning();

 
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nodeKeys.all });
    },
  });
}

export async function ensureRootNode() {
  // 1. Try to fetch root
  const root = await db.query.nodes.findFirst({
    where: eq(nodes.id, ROOT_NODE_ID),
  });

  

  if (root) return root;

  // 2. Create root if missing
  const [created] = await db
    .insert(nodes)
    .values({
      id: ROOT_NODE_ID,
      name: "products",
      type: "group",
      parentId: null,
      position: 0,
      displayName:"products"
    })
    .returning();

  return created;
}

