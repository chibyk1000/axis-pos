import { db } from "@/db/database";
import { eq } from "drizzle-orm";
import { nodes } from "@/db/schema/nodes";
import { type Node, type NewNode, products, Product } from "@/db/schema/index";
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
        with: {
          products: true,
        },
      });

      // 2️⃣ Build tree recursively
      const visited = new Set<string>();
      function buildTree(nodes: any, parentId: string | null = null) {
        return nodes
          .filter((n: any) => n.parentId === parentId)
          .filter((n: any) => !visited.has(n.id))
          .map((n: any) => {
            visited.add(n.id);
            return {
              ...n,
              children: buildTree(nodes, n.id), // recursion for children
            };
          });
      }

      // 3️⃣ Return tree starting from root nodes
      return buildTree(allNodes);
    },
  });
}
export function useRootWithoutChildren() {
  return useQuery({
    queryKey: ["root-nochild"],
    queryFn: async () => {
      const allNodes = await db.query.nodes.findMany({
        orderBy: (nodes) => nodes.position, // keep ordering
      });
      return allNodes;
    },
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

type TreeElement =
  | {
      id: string;
      name: string;
      type: "group";
      children: TreeElement[];
    }
  | {
      id: string;
      name: string;
      type: "product";
      product: Product;
    };

function buildTree(nodes: Node[], products: Product[]): TreeElement[] {
  const map = new Map<string, TreeElement>();

  // create group nodes
  nodes.forEach((node) => {
    map.set(node.id, {
      id: node.id,
      name: node.name,
      type: "group",
      children: [],
    });
  });

  // attach groups to parents
  const roots: TreeElement[] = [];

  nodes.forEach((node) => {
    const current = map.get(node.id)!;

    if (node.parentId) {
      const parent = map.get(node.parentId);
      // @ts-ignore
      parent?.children.push(current);
    } else {
      roots.push(current);
    }
  });

  // attach products to their node
  products.forEach((product) => {
    const parent = map.get(product.nodeId);
    if (!parent) return;
    // @ts-ignore
    parent.children.push({
      id: product.id,
      name: product.title,
      type: "product",
      product,
    });
  });

  return roots;
}
export function useNodeTree() {
  return useQuery({
    queryKey: ["node-tree"],
    queryFn: async () => {
      const [allNodes, allProducts] = await Promise.all([
        db.select().from(nodes).orderBy(nodes.position),
        db.select().from(products),
      ]);
      // @ts-ignore
      return buildTree(allNodes, allProducts);
    },
  });
}

export function useCreateNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewNode) => {
      await db.insert(nodes).values(data);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nodeKeys.all });
      qc.invalidateQueries({ queryKey: ["root-nochild"] });
      qc.invalidateQueries();
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
      await db.update(nodes).set(data).where(eq(nodes.id, id));
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
      await db
        .update(nodes)
        .set({ parentId, position })
        .where(eq(nodes.id, id));
      const updated = await db.query.nodes.findFirst({
        where: eq(nodes.id, id),
      });
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
      await db.delete(nodes).where(eq(nodes.id, id));
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
  await db.insert(nodes).values({
    id: ROOT_NODE_ID,
    name: "products",
    type: "group",
    parentId: null,
    position: 0,
    displayName: "products",
  });

  const created = await db.query.nodes.findFirst({
    where: eq(nodes.id, ROOT_NODE_ID),
  });
  return created;
}
