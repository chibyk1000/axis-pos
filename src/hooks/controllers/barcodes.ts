// hooks/controllers/barcodes.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";

import { eq } from "drizzle-orm";
import { barcodes } from "@/db/schema";

// Query Keys
export const barcodeKeys = {
  all: ["barcodes"] as const,
  byProduct: (productId: string) => [...barcodeKeys.all, productId] as const,
  byId: (id: string) => [...barcodeKeys.all, "id", id] as const,
};

// ---------- QUERIES ----------

// Fetch all barcodes for a product
export function useBarcodes(productId: string) {
  return useQuery({
    queryKey: barcodeKeys.byProduct(productId),
    queryFn: async () => {
      return db.query.barcodes.findMany({
        where: eq(barcodes.productId, productId),
        orderBy: (b) => b.createdAt,
      });
    },
  });
}

// Fetch single barcode by id
export function useBarcode(id: string) {
  return useQuery({
    queryKey: barcodeKeys.byId(id),
    queryFn: async () => {
      const barcode = await db.query.barcodes.findFirst({
        where: eq(barcodes.id, id),
      });
      if (!barcode) throw new Error("Barcode not found");
      return barcode;
    },
  });
}

// ---------- MUTATIONS ----------

// Create a barcode
export function useCreateBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      value: string;
      type: "EAN13" | "UPC" | "CODE128" | "QR";
      productId: string;
      isPrimary?: boolean;
    }) => {
      await db.insert(barcodes).values(data);
      return data;
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: barcodeKeys.byProduct(productId) });
    },
  });
}

// Update a barcode
export function useUpdateBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        value: string;
        type: "EAN13" | "UPC" | "CODE128" | "QR";
        isPrimary: boolean;
      }>;
    }) => {
      const existing = await db.query.barcodes.findFirst({
        where: eq(barcodes.id, id),
      });
      if (!existing) throw new Error("Barcode not found");
      await db.update(barcodes).set(data).where(eq(barcodes.id, id));
      const updated = await db.query.barcodes.findFirst({
        where: eq(barcodes.id, id),
      });
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: barcodeKeys.byId(id) });
    },
  });
}

// Delete all barcodes for a product
export function useDeleteBarcodesByProductId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      await db.delete(barcodes).where(eq(barcodes.productId, productId));
      return true;
    },
    onSuccess: (_, productId) => {
      qc.invalidateQueries({ queryKey: barcodeKeys.byProduct(productId) });
    },
  });
}
