import type { InvoiceData } from "./pdf";

type T = (key: string, vars?: Record<string, string | number>) => string;

export function invoiceLabels(t: T): InvoiceData["labels"] {
  return {
    invoice: t("invoices.title"),
    billTo: t("invoices.billTo"),
    date: t("invoices.date"),
    product: t("common.product"),
    qty: t("common.quantity"),
    rate: t("common.rate"),
    amount: t("common.amount"),
    subtotal: t("sales.subtotal"),
    discount: t("sales.discount"),
    total: t("sales.grandTotal"),
    paid: t("common.paid"),
    pending: t("common.pending"),
    gst: t("invoices.gst"),
    thankYou: t("invoices.thankYou"),
  };
}
