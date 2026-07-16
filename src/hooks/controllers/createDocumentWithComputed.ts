import { Document, DocumentPayment, DocumentItem } from "./documents";

export function createDocumentWithComputed(
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
