import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import {
  documents,
  documentItems,
  documentPayments,
  customers,
  stockEntries,
  stockLogs,
} from "@/db/schema";
import { and, or, like, gte, lte, eq, desc, count } from "drizzle-orm";
import { logActivity } from "@/lib/activity-log";
import { getCurrentUser } from "@/providers/auth-provider";
import { getOrCreateWalkInCustomer } from "./customers";

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentItem = typeof documentItems.$inferInsert;
export type DocumentPayment = typeof documentPayments.$inferInsert;

/**
 * Generates the next sequential document number following Aronium convention:
 * Format: YY-TTT-SSSSSS (e.g. 26-100-000001)
 * - YY: 2-digit current year (e.g. 26 for 2026)
 * - TTT: document type code (e.g. 100 for Purchase, 200 for Sales, etc.)
 * - SSSSSS: 6-digit zero-padded sequential number
 */
export async function getNextDocumentNumber(
  documentType: number = 200,
  docDate: Date = new Date(),
): Promise<string> {
  const d = docDate ? new Date(docDate) : new Date();
  const year2Digit = isNaN(d.getTime())
    ? new Date().getFullYear().toString().slice(-2)
    : d.getFullYear().toString().slice(-2);
  const typeCode = String(documentType ?? 200);
  const prefix = `${year2Digit}-${typeCode}-`;

  const rows = await db
    .select({ number: documents.number })
    .from(documents)
    .where(like(documents.number, `${prefix}%`));

  let maxSerial = 0;
  const regex = new RegExp(`^${year2Digit}-${typeCode}-(\\d+)$`);

  for (const row of rows) {
    if (!row.number) continue;
    const match = row.number.match(regex);
    if (match && match[1]) {
      const serial = parseInt(match[1], 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  }

  const nextSerial = maxSerial + 1;
  return `${prefix}${String(nextSerial).padStart(6, "0")}`;
}

/**
 * Applies stock movement for document items according to Aronium standard document types:
 * - 100 (Purchase): stock IN (+quantity)
 * - 120 (Stock Return to Supplier): stock OUT (-quantity)
 * - 200 (Sales / Receipt): stock OUT (-quantity) [or IN if negative quantity]
 * - 220 (Refund from Customer): stock IN (+quantity)
 * - 230 (Proforma): no stock change
 * - 300 (Inventory count): stock adjustment (=quantity)
 * - 400 (Loss & Damage): stock OUT (-quantity)
 * - isRevert: if true, inverts the change (when updating or deleting a document)
 */
async function applyDocumentStock(
  docId: string,
  docNumber: string,
  docType: number | null | undefined,
  items: Array<{ productId: string; quantity: number }>,
  isRevert: boolean = false,
  customNote?: string,
) {
  if (!items || items.length === 0) return;
  const typeCode = docType ?? 200;

  // Proforma does not affect stock
  if (typeCode === 230) return;

  for (const item of items) {
    if (!item.productId || typeof item.quantity !== "number") continue;

    let movementType: "in" | "out" | "adjustment";
    let changeQty: number;

    if (typeCode === 100) {
      // Purchase: IN
      movementType = isRevert ? "out" : "in";
      changeQty = isRevert ? -Math.abs(item.quantity) : Math.abs(item.quantity);
    } else if (typeCode === 120) {
      // Stock Return: OUT
      movementType = isRevert ? "in" : "out";
      changeQty = isRevert ? Math.abs(item.quantity) : -Math.abs(item.quantity);
    } else if (typeCode === 200) {
      // Sales: OUT (or IN if negative quantity)
      if (item.quantity >= 0) {
        movementType = isRevert ? "in" : "out";
        changeQty = isRevert ? Math.abs(item.quantity) : -Math.abs(item.quantity);
      } else {
        movementType = isRevert ? "out" : "in";
        changeQty = isRevert ? -Math.abs(item.quantity) : Math.abs(item.quantity);
      }
    } else if (typeCode === 220) {
      // Refund: IN
      movementType = isRevert ? "out" : "in";
      changeQty = isRevert ? -Math.abs(item.quantity) : Math.abs(item.quantity);
    } else if (typeCode === 300) {
      // Inventory Count: sets exact quantity
      movementType = "adjustment";
      changeQty = item.quantity;
    } else if (typeCode === 400) {
      // Loss & Damage: OUT
      movementType = isRevert ? "in" : "out";
      changeQty = isRevert ? Math.abs(item.quantity) : -Math.abs(item.quantity);
    } else {
      if (typeCode < 200) {
        movementType = isRevert ? "out" : "in";
        changeQty = isRevert ? -Math.abs(item.quantity) : Math.abs(item.quantity);
      } else {
        movementType = isRevert ? "in" : "out";
        changeQty = isRevert ? Math.abs(item.quantity) : -Math.abs(item.quantity);
      }
    }

    const existing = await db.query.stockEntries.findFirst({
      where: eq(stockEntries.productId, item.productId),
    });

    const currentQty = existing?.quantity ?? 0;
    let newQuantity: number;
    if (movementType === "adjustment") {
      newQuantity = isRevert ? currentQty : changeQty;
    } else {
      newQuantity = currentQty + changeQty;
    }

    const note =
      customNote ||
      (isRevert
        ? `Reverted Doc #${docNumber || docId}`
        : `Doc #${docNumber || docId}`);

    const id = existing?.id ?? crypto.randomUUID();

    await db
      .insert(stockEntries)
      .values({
        id,
        productId: item.productId,
        type: movementType,
        quantity: newQuantity,
        note,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: stockEntries.productId,
        set: {
          type: movementType,
          quantity: newQuantity,
          note,
          createdAt: new Date(),
        },
      });

    if (!isRevert) {
      await db.insert(stockLogs).values({
        id: crypto.randomUUID(),
        productId: item.productId,
        documentId: docId,
        type: movementType,
        quantity: Math.abs(item.quantity),
        note,
        createdAt: new Date(),
      });
    }
  }
}

// Enhanced document type with computed properties
export type DocumentWithComputed = ReturnType<
  typeof createDocumentWithComputed
>;

function createDocumentWithComputed(
  doc: Document,
  docPayments: DocumentPayment[],
  customer: any | null,
  items: DocumentItem[],
) {
  const totalPaid = docPayments.reduce((sum, p) => sum + p.amount, 0);
  const docTotal = doc.total ?? 0;
  const outstandingBalance = Math.max(0, docTotal - totalPaid);

  return {
    ...doc,
    customer,
    items,
    payments: docPayments,
    totalPaid,
    outstandingBalance,
  };
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const [docs, items, payments, custs] = await Promise.all([
        db.select().from(documents).orderBy(desc(documents.createdAt)),
        db.select().from(documentItems),
        db.select().from(documentPayments),
        db.select().from(customers),
      ]);

      const customerMap = new Map(custs.map((c) => [c.id, c]));
      const itemsByDoc = new Map<string, (typeof items)[number][]>();
      for (const item of items) {
        const list = itemsByDoc.get(item.documentId);
        if (list) list.push(item);
        else itemsByDoc.set(item.documentId, [item]);
      }
      const paymentsByDoc = new Map<string, (typeof payments)[number][]>();
      for (const payment of payments) {
        const list = paymentsByDoc.get(payment.documentId);
        if (list) list.push(payment);
        else paymentsByDoc.set(payment.documentId, [payment]);
      }

      return docs.map((doc) =>
        createDocumentWithComputed(
          doc,
          paymentsByDoc.get(doc.id) ?? [],
          doc.customerId ? customerMap.get(doc.customerId) ?? null : null,
          itemsByDoc.get(doc.id) ?? [],
        ),
      );
    },
  });
}

export type DocumentListFilters = {
  userId?: number | null;
  customerId?: string | null;
  type?: number | null;
  paid?: boolean | null;
  search?: string;
  fromMs?: number | null;
  toMs?: number | null;
};

function documentFilterConditions(f: DocumentListFilters) {
  const conds = [];
  if (f.userId != null) conds.push(eq(documents.userId, f.userId));
  if (f.customerId) conds.push(eq(documents.customerId, f.customerId));
  if (f.type != null) conds.push(eq(documents.type, f.type));
  if (f.paid != null) conds.push(eq(documents.paid, f.paid));
  const s = f.search?.trim();
  if (s) {
    conds.push(
      or(
        like(documents.number, `%${s}%`),
        like(documents.externalNumber, `%${s}%`),
        like(customers.name, `%${s}%`),
      ),
    );
  }
  if (f.fromMs != null) conds.push(gte(documents.date, new Date(f.fromMs)));
  if (f.toMs != null) conds.push(lte(documents.date, new Date(f.toMs)));
  return conds;
}

export type DocumentPageRow = {
  id: string;
  number: string;
  externalNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  userId: number | null;
  date: Date;
  paid: boolean | null;
  type: number | null;
  status: "draft" | "posted" | "cancelled" | null;
  total: number | null;
  totalPaid: number | null;
  outstandingBalance: number | null;
};

export function useDocumentsPage(
  filters: DocumentListFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["documents", "page", JSON.stringify(filters), page, pageSize],
    queryFn: async (): Promise<DocumentPageRow[]> => {
      const conds = documentFilterConditions(filters);
      const rows = await db
        .select({
          id: documents.id,
          number: documents.number,
          externalNumber: documents.externalNumber,
          customerId: documents.customerId,
          customerName: customers.name,
          userId: documents.userId,
          date: documents.date,
          paid: documents.paid,
          type: documents.type,
          status: documents.status,
          total: documents.total,
          totalPaid: documents.totalPaid,
          outstandingBalance: documents.outstandingBalance,
        })
        .from(documents)
        .leftJoin(customers, eq(documents.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(documents.date))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return rows as DocumentPageRow[];
    },
    placeholderData: (prev) => prev,
  });
}

export function useDocumentsCount(filters: DocumentListFilters) {
  return useQuery({
    queryKey: ["documents", "count", JSON.stringify(filters)],
    queryFn: async (): Promise<number> => {
      const conds = documentFilterConditions(filters);
      const [row] = await db
        .select({ total: count(documents.id) })
        .from(documents)
        .leftJoin(customers, eq(documents.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined);
      return row?.total ?? 0;
    },
  });
}

export function useDocumentById(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    enabled: !!id,
    queryFn: async () => {
      const [doc, docItems, docPayments] = await Promise.all([
        db.select().from(documents).where(eq(documents.id, id)).get(),
        db.select().from(documentItems).where(eq(documentItems.documentId, id)),
        db
          .select()
          .from(documentPayments)
          .where(eq(documentPayments.documentId, id)),
      ]);

      if (!doc) throw new Error("Document not found");

      let customer = null;
      if (doc.customerId) {
        customer = await db
          .select()
          .from(customers)
          .where(eq(customers.id, doc.customerId))
          .get();
      }

      return createDocumentWithComputed(
        doc,
        docPayments,
        customer,
        docItems,
      );
    },
  });
}

export const useDocument = useDocumentById;

export function useCreateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      document: NewDocument;
      items?: DocumentItem[];
      payments?: DocumentPayment[];
      skipStockUpdate?: boolean;
    }) => {
      try {
        const docId = data.document.id ?? crypto.randomUUID();

        const totalPaid =
          data.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
        const docTotal = data.document.total ?? 0;
        const isPaid = totalPaid >= docTotal;

        let customerId =
          data.document.customerId &&
          String(data.document.customerId).trim() !== ""
            ? String(data.document.customerId)
            : null;

        if (!customerId) {
          const walkIn = await getOrCreateWalkInCustomer();
          customerId = walkIn.id;
        }

        let docNumber = data.document.number;
        if (
          !docNumber ||
          docNumber.trim() === "" ||
          docNumber === "New Document" ||
          docNumber.startsWith("Doc #")
        ) {
          docNumber = await getNextDocumentNumber(
            data.document.type ?? 200,
            data.document.date ?? new Date(),
          );
        }

        const insertPayload = {
          ...data.document,
          number: docNumber,
          id: docId,
          customerId,
          userId: data.document.userId ?? getCurrentUser()?.id ?? null,
          totalPaid,
          outstandingBalance: Math.max(0, docTotal - totalPaid),
          paid: isPaid,
          createdAt: data.document.createdAt ?? new Date(),
        };

        await db.insert(documents).values(insertPayload);

        if (data.items?.length) {
          await db.insert(documentItems).values(
            data.items.map((item) => ({
              ...item,
              id: item.id ?? crypto.randomUUID(),
              documentId: docId,
            })),
          );

          if (!data.skipStockUpdate) {
            await applyDocumentStock(
              docId,
              insertPayload.number,
              insertPayload.type,
              data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              false,
            );
          }
        }

        if (data.payments?.length) {
          await db.insert(documentPayments).values(
            data.payments.map((p) => ({
              ...p,
              id: p.id ?? crypto.randomUUID(),
              documentId: docId,
            })),
          );
        }

        logActivity({
          action: "document.create",
          entityType: "document",
          entityId: docId,
          description: `Created document ${insertPayload.number} (total ${docTotal.toFixed(2)})`,
          metadata: {
            status: insertPayload.status,
            total: docTotal,
            userId: insertPayload.userId,
            type: insertPayload.type,
          },
        });
      } catch (err) {
        console.error("useCreateDocument - error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stockLogs"] });
      qc.refetchQueries({ queryKey: ["stock"] });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      document: Partial<NewDocument>;
      items: DocumentItem[];
      payments?: DocumentPayment[];
      skipStockUpdate?: boolean;
    }) => {
      const currentDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, data.id))
        .get();

      if (!currentDoc) throw new Error("Document not found");

      if (!data.skipStockUpdate) {
        const oldItems = await db
          .select()
          .from(documentItems)
          .where(eq(documentItems.documentId, data.id));

        if (oldItems.length > 0) {
          await applyDocumentStock(
            data.id,
            currentDoc.number,
            currentDoc.type,
            oldItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            true,
          );
        }
      }

      const totalPaid =
        data.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
      const docTotal = data.document.total ?? currentDoc.total ?? 0;
      const isPaid = totalPaid >= docTotal;

      await db
        .update(documents)
        .set({
          ...data.document,
          totalPaid,
          outstandingBalance: Math.max(0, docTotal - totalPaid),
          paid: isPaid,
        })
        .where(eq(documents.id, data.id));

      await db
        .delete(documentItems)
        .where(eq(documentItems.documentId, data.id));
      await db
        .delete(documentPayments)
        .where(eq(documentPayments.documentId, data.id));

      if (data.items?.length) {
        await db.insert(documentItems).values(
          data.items.map((item) => ({
            ...item,
            id: item.id ?? crypto.randomUUID(),
            documentId: data.id,
          })),
        );

        if (!data.skipStockUpdate) {
          await applyDocumentStock(
            data.id,
            data.document.number ?? currentDoc.number,
            data.document.type ?? currentDoc.type,
            data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            false,
          );
        }
      }

      if (data.payments?.length) {
        await db.insert(documentPayments).values(
          data.payments.map((p) => ({
            ...p,
            id: p.id ?? crypto.randomUUID(),
            documentId: data.id,
          })),
        );
      }

      logActivity({
        action: "document.update",
        entityType: "document",
        entityId: data.id,
        description: `Updated document ${currentDoc.number}`,
      });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents", variables.id] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stockLogs"] });
      qc.refetchQueries({ queryKey: ["stock"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .get();

      if (existing) {
        const oldItems = await db
          .select()
          .from(documentItems)
          .where(eq(documentItems.documentId, id));

        if (oldItems.length > 0) {
          await applyDocumentStock(
            id,
            existing.number,
            existing.type,
            oldItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            true,
          );
        }
      }

      await db
        .update(stockLogs)
        .set({ documentId: null })
        .where(eq(stockLogs.documentId, id));

      await db.delete(documents).where(eq(documents.id, id));
      logActivity({
        action: "document.delete",
        entityType: "document",
        entityId: id,
        description: `Deleted document ${existing?.number ?? id}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stockLogs"] });
      qc.refetchQueries({ queryKey: ["stock"] });
    },
  });
}
