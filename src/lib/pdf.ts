import { jsPDF } from "jspdf";
import { money, formatDate, qty } from "./format";
import type { BusinessSettings, SaleRow } from "./data";

const GUJARATI = /[\u0A80-\u0AFF]/;
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf";

let gujaratiFont: string | null | undefined;

async function loadGujaratiFont(): Promise<string | null> {
  if (gujaratiFont !== undefined) return gujaratiFont;
  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error("font fetch failed");
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 8192) {
      binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    gujaratiFont = btoa(binary);
  } catch {
    gujaratiFont = null;
  }
  return gujaratiFont;
}

export type InvoiceLine = {
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type InvoiceData = {
  invoiceNo: string;
  date: string;
  business: BusinessSettings | null;
  customer: { name: string; mobile?: string | null; address?: string | null; city?: string | null };
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  pending: number;
  notes?: string | null;
  labels: {
    invoice: string;
    billTo: string;
    date: string;
    product: string;
    qty: string;
    rate: string;
    amount: string;
    subtotal: string;
    discount: string;
    total: string;
    paid: string;
    pending: string;
    gst: string;
    thankYou: string;
  };
};

export function saleToInvoice(
  sale: SaleRow,
  settings: BusinessSettings | null,
  labels: InvoiceData["labels"],
): InvoiceData {
  return {
    invoiceNo: sale.invoice_no,
    date: sale.sale_date,
    business: settings,
    customer: {
      name: sale.customers?.name ?? "-",
      mobile: sale.customers?.mobile ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      address: (sale.customers as any)?.address ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      city: (sale.customers as any)?.city ?? null,
    },
    lines: (sale.sale_items ?? []).map((i) => ({
      name: i.products?.name ?? "-",
      quantity: Number(i.quantity) - Number(i.returned_quantity ?? 0),
      unit: i.unit,
      rate: Number(i.rate),
      amount: (Number(i.quantity) - Number(i.returned_quantity ?? 0)) * Number(i.rate),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    paid: Number(sale.paid_amount),
    pending: Number(sale.pending_amount),
    notes: sale.notes,
    labels,
  };
}

export async function buildInvoicePdf(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let font = "helvetica";

  const allText = JSON.stringify(data);
  if (GUJARATI.test(allText)) {
    const b64 = await loadGujaratiFont();
    if (b64) {
      doc.addFileToVFS("NotoSansGujarati.ttf", b64);
      doc.addFont("NotoSansGujarati.ttf", "gujarati", "normal");
      font = "gujarati";
    }
  }

  const setFont = (style: "normal" | "bold" = "normal") =>
    doc.setFont(font, font === "gujarati" ? "normal" : style);

  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  // Header
  setFont("bold");
  doc.setFontSize(20);
  doc.text(data.business?.business_name || "Invoice", M, y);
  setFont();
  doc.setFontSize(9);
  const infoLines = [
    data.business?.address,
    data.business?.city,
    data.business?.phone ? `Ph: ${data.business.phone}` : null,
    data.business?.email,
    data.business?.gst_number ? `${data.labels.gst}: ${data.business.gst_number}` : null,
  ].filter(Boolean) as string[];
  let iy = y + 14;
  infoLines.forEach((l) => {
    doc.text(l, M, iy);
    iy += 12;
  });

  setFont("bold");
  doc.setFontSize(16);
  doc.text(data.labels.invoice, W - M, y, { align: "right" });
  setFont();
  doc.setFontSize(10);
  doc.text(`#${data.invoiceNo}`, W - M, y + 16, { align: "right" });
  doc.text(`${data.labels.date}: ${formatDate(data.date)}`, W - M, y + 30, { align: "right" });

  y = Math.max(iy, y + 44) + 12;
  doc.setDrawColor(210);
  doc.line(M, y, W - M, y);
  y += 22;

  // Bill to
  setFont("bold");
  doc.setFontSize(11);
  doc.text(data.labels.billTo, M, y);
  setFont();
  doc.setFontSize(10);
  y += 15;
  [data.customer.name, data.customer.mobile, data.customer.address, data.customer.city]
    .filter(Boolean)
    .forEach((l) => {
      doc.text(String(l), M, y);
      y += 13;
    });

  y += 12;

  // Table header
  const colQty = W - M - 250;
  const colRate = W - M - 150;
  const colAmt = W - M;
  doc.setFillColor(240, 244, 242);
  doc.rect(M, y - 12, W - M * 2, 20, "F");
  setFont("bold");
  doc.setFontSize(9.5);
  doc.text(data.labels.product, M + 6, y + 2);
  doc.text(data.labels.qty, colQty, y + 2, { align: "right" });
  doc.text(data.labels.rate, colRate, y + 2, { align: "right" });
  doc.text(data.labels.amount, colAmt - 6, y + 2, { align: "right" });
  y += 24;
  setFont();

  data.lines.forEach((line, idx) => {
    if (y > doc.internal.pageSize.getHeight() - 160) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(9.5);
    doc.text(`${idx + 1}. ${line.name}`, M + 6, y, { maxWidth: colQty - M - 24 });
    doc.text(`${qty(line.quantity)} ${line.unit}`, colQty, y, { align: "right" });
    doc.text(money(line.rate), colRate, y, { align: "right" });
    doc.text(money(line.amount), colAmt - 6, y, { align: "right" });
    y += 18;
  });

  doc.line(M, y, W - M, y);
  y += 18;

  const totalRow = (label: string, value: string, bold = false) => {
    setFont(bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.text(label, colRate, y, { align: "right" });
    doc.text(value, colAmt - 6, y, { align: "right" });
    y += 16;
  };

  totalRow(data.labels.subtotal, money(data.subtotal));
  if (data.discount > 0) totalRow(data.labels.discount, `- ${money(data.discount)}`);
  totalRow(data.labels.total, money(data.total), true);
  totalRow(data.labels.paid, money(data.paid));
  totalRow(data.labels.pending, money(data.pending), data.pending > 0);

  if (data.notes) {
    y += 10;
    setFont();
    doc.setFontSize(9);
    doc.text(String(data.notes), M, y, { maxWidth: W - M * 2 });
    y += 18;
  }

  y += 16;
  setFont();
  doc.setFontSize(10);
  doc.text(data.business?.invoice_footer || data.labels.thankYou, W / 2, y, { align: "center" });

  return doc;
}

export async function downloadInvoicePdf(data: InvoiceData) {
  const doc = await buildInvoicePdf(data);
  doc.save(`${data.invoiceNo}.pdf`);
}

export async function shareInvoice(data: InvoiceData, message: string, whatsappNumber?: string | null) {
  const doc = await buildInvoicePdf(data);
  const blob = doc.output("blob");
  const file = new File([blob], `${data.invoiceNo}.pdf`, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
    share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: data.invoiceNo, text: message });
    return "shared" as const;
  }

  doc.save(`${data.invoiceNo}.pdf`);
  const digits = (whatsappNumber ?? "").replace(/\D/g, "");
  const url = digits
    ? `https://wa.me/${digits.length > 10 ? digits : `91${digits}`}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
  return "downloaded" as const;
}
