import { jsPDF } from "jspdf";
import { formatDate, qty } from "./format";
import type { BusinessSettings, PaymentRow, SaleRow } from "./data";

const GUJARATI = /[\u0A80-\u0AFF]/;
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf";

let gujaratiFont: string | null | undefined;

function toBase64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

async function loadGujaratiFont(): Promise<string | null> {
  if (gujaratiFont !== undefined) return gujaratiFont;
  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error("font fetch failed");
    gujaratiFont = toBase64(new Uint8Array(await res.arrayBuffer()));
  } catch {
    gujaratiFont = null;
  }
  return gujaratiFont;
}

const logoCache = new Map<string, string | null>();

async function loadLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url) ?? null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("logo fetch failed");
    const blob = await res.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    const type = blob.type || "image/png";
    const data = `data:${type};base64,${toBase64(buf)}`;
    logoCache.set(url, data);
    return data;
  } catch {
    logoCache.set(url, null);
    return null;
  }
}

export type InvoiceLine = {
  name: string;
  sku?: string | null;
  description?: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type InvoicePayment = {
  date: string;
  method: string;
  amount: number;
  reference?: string | null;
};

export type InvoiceStatus = "paid" | "partial" | "pending";

export type InvoiceLabels = {
  invoice: string;
  billTo: string;
  date: string;
  time: string;
  dueDate: string;
  no: string;
  product: string;
  sku: string;
  unit: string;
  qty: string;
  rate: string;
  amount: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  pending: string;
  gst: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  thankYou: string;
  invoiceNo: string;
  paymentStatus: string;
  statusPaid: string;
  statusPartial: string;
  statusPending: string;
  paymentDetails: string;
  method: string;
  reference: string;
  invoicePending: string;
  customerOutstanding: string;
  notes: string;
  terms: string;
  termLines: string[];
  page: (current: number, total: number) => string;
  waMessage: (v: {
    name: string;
    business: string;
    invoice: string;
    total: string;
    paid: string;
    pending: string;
  }) => string;
  cancelled: string;
};

export type InvoiceData = {
  invoiceNo: string;
  date: string;
  time?: string | null;
  dueDate?: string | null;
  status: InvoiceStatus;
  cancelled?: boolean;
  business: BusinessSettings | null;
  businessTagline?: string | null;
  customer: {
    name: string;
    mobile?: string | null;
    address?: string | null;
    city?: string | null;
    email?: string | null;
    gst?: string | null;
  };
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  tax?: number;
  total: number;
  paid: number;
  pending: number;
  payments?: InvoicePayment[];
  customerOutstanding?: number | null;
  notes?: string | null;
  labels: InvoiceLabels;
};

function statusOf(sale: SaleRow): InvoiceStatus {
  const total = Number(sale.total);
  const paid = Number(sale.paid_amount);
  if (paid >= total - 0.009) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

export function saleToInvoice(
  sale: SaleRow,
  settings: BusinessSettings | null,
  labels: InvoiceLabels,
  extra: {
    payments?: PaymentRow[];
    customerOutstanding?: number | null;
    methodLabel?: (m: string) => string;
    unitLabel?: (u: string) => string;
  } = {},
): InvoiceData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (sale.customers ?? {}) as any;
  return {
    invoiceNo: sale.invoice_no,
    date: sale.sale_date,
    time: sale.created_at
      ? new Date(sale.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : null,
    status: statusOf(sale),
    cancelled: sale.status === "CANCELLED",
    business: settings,
    customer: {
      name: c.name ?? "-",
      mobile: c.mobile ?? null,
      address: c.address ?? null,
      city: c.city ?? null,
      email: c.email ?? null,
      gst: c.gst_number ?? null,
    },
    lines: (sale.sale_items ?? [])
      .map((i) => {
        const quantity = Number(i.quantity) - Number(i.returned_quantity ?? 0);
        return {
          name: i.products?.name ?? "-",
          sku: i.products?.sku ?? null,
          quantity,
          unit: extra.unitLabel ? extra.unitLabel(i.unit) : i.unit,
          rate: Number(i.rate),
          amount: quantity * Number(i.rate),
        };
      })
      .filter((l) => l.quantity > 0),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    paid: Number(sale.paid_amount),
    pending: Number(sale.pending_amount),
    payments: (extra.payments ?? [])
      .filter((p) => !p.is_reversal)
      .map((p) => ({
        date: p.paid_at,
        method: extra.methodLabel ? extra.methodLabel(p.method) : p.method,
        amount: Number(p.amount),
        reference: p.reference ?? null,
      })),
    customerOutstanding: extra.customerOutstanding ?? null,
    notes: sale.notes,
    labels,
  };
}

/* ------------------------------- rendering ------------------------------- */

const INK = { r: 24, g: 36, b: 33 };
const BRAND = { r: 13, g: 106, b: 84 };
const SOFT = { r: 236, g: 243, b: 240 };
const LINE = 205;
const MUTED = 110;

export async function buildInvoicePdf(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  let font = "helvetica";
  let unicode = false;
  if (GUJARATI.test(JSON.stringify(data))) {
    const b64 = await loadGujaratiFont();
    if (b64) {
      doc.addFileToVFS("NotoSansGujarati.ttf", b64);
      doc.addFont("NotoSansGujarati.ttf", "gujarati", "normal");
      font = "gujarati";
      unicode = true;
    }
  }
  const logo = await loadLogo(data.business?.logo_url ?? null);

  const money = (v: number | null | undefined) => {
    const n = Number.isFinite(Number(v)) ? Number(v) : 0;
    const s = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return unicode ? `\u20B9${s}` : `Rs. ${s}`;
  };

  const L = data.labels;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const CW = W - M * 2;

  const setFont = (style: "normal" | "bold" = "normal") =>
    doc.setFont(font, unicode ? "normal" : style);
  const ink = () => doc.setTextColor(INK.r, INK.g, INK.b);
  const muted = () => doc.setTextColor(MUTED);

  // column layout for items table
  const cols = {
    no: M + 8,
    name: M + 34,
    sku: M + CW * 0.44,
    unit: M + CW * 0.585,
    qty: M + CW * 0.7,
    rate: M + CW * 0.83,
    amount: W - M - 8,
  };

  let y = 0;
  let page = 1;

  const drawTableHeader = () => {
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.rect(M, y, CW, 22, "F");
    doc.setTextColor(255);
    setFont("bold");
    doc.setFontSize(9);
    doc.text(L.no, cols.no, y + 14.5);
    doc.text(L.product, cols.name, y + 14.5);
    doc.text(L.sku, cols.sku, y + 14.5);
    doc.text(L.unit, cols.unit, y + 14.5);
    doc.text(L.qty, cols.qty, y + 14.5, { align: "right" });
    doc.text(L.rate, cols.rate, y + 14.5, { align: "right" });
    doc.text(L.amount, cols.amount, y + 14.5, { align: "right" });
    y += 22;
    ink();
    setFont();
  };

  const drawBusinessHeader = (compact = false) => {
    y = M;
    const logoMaxW = 78;
    const logoMaxH = 58;
    let textX = M;
    if (logo && !compact) {
      try {
        const props = doc.getImageProperties(logo);
        const ratio = props.width / props.height;
        let w = logoMaxW;
        let h = w / ratio;
        if (h > logoMaxH) {
          h = logoMaxH;
          w = h * ratio;
        }
        doc.addImage(logo, M, y, w, h);
        textX = M + w + 14;
      } catch {
        /* ignore bad logo */
      }
    }

    setFont("bold");
    doc.setFontSize(compact ? 13 : 18);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(data.business?.business_name || "Invoice", textX, y + (compact ? 12 : 16));
    let iy = y + (compact ? 26 : 32);

    if (!compact) {
      ink();
      setFont();
      doc.setFontSize(9);
      if (data.businessTagline) {
        muted();
        doc.text(data.businessTagline, textX, iy - 12);
      }
      muted();
      const contact = [
        [data.business?.address, data.business?.city].filter(Boolean).join(", ") || null,
        data.business?.phone ? `${L.mobile}: ${data.business.phone}` : null,
        data.business?.whatsapp && data.business.whatsapp !== data.business.phone
          ? `${L.whatsapp}: ${data.business.whatsapp}`
          : null,
        data.business?.email ? `${L.email}: ${data.business.email}` : null,
        data.business?.gst_number ? `${L.gst}: ${data.business.gst_number}` : null,
      ].filter(Boolean) as string[];
      contact.forEach((line) => {
        doc.text(line, textX, iy, { maxWidth: CW * 0.58 });
        iy += 12;
      });
      ink();
    }

    // invoice block (right)
    setFont("bold");
    doc.setFontSize(compact ? 13 : 20);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(L.invoice.toUpperCase(), W - M, y + (compact ? 12 : 16), { align: "right" });
    setFont();
    doc.setFontSize(9.5);
    let ry = y + (compact ? 26 : 34);
    const rightLines = compact
      ? [`${L.invoiceNo}: ${data.invoiceNo}`]
      : [
          `${L.invoiceNo}: ${data.invoiceNo}`,
          `${L.date}: ${formatDate(data.date)}`,
          data.time ? `${L.time}: ${data.time}` : null,
          data.dueDate ? `${L.dueDate}: ${formatDate(data.dueDate)}` : null,
        ].filter(Boolean) as string[];
    rightLines.forEach((line) => {
      doc.text(line, W - M, ry, { align: "right" });
      ry += 13;
    });

    y = Math.max(iy, ry) + (compact ? 4 : 8);
    doc.setDrawColor(LINE);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += compact ? 16 : 20;
  };

  const statusText =
    data.status === "paid" ? L.statusPaid : data.status === "partial" ? L.statusPartial : L.statusPending;

  const drawStatusPill = (yy: number) => {
    const color =
      data.status === "paid" ? { r: 22, g: 122, b: 78 } : data.status === "partial" ? { r: 191, g: 129, b: 20 } : { r: 178, g: 52, b: 45 };
    setFont("bold");
    doc.setFontSize(10);
    const label = `${statusText}`;
    const tw = doc.getTextWidth(label) + 22;
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(W - M - tw, yy, tw, 22, 5, 5, "F");
    doc.setTextColor(255);
    doc.text(label, W - M - tw / 2, yy + 15, { align: "center" });
    ink();
    setFont();
  };

  const drawFooters = () => {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p += 1) {
      doc.setPage(p);
      setFont();
      doc.setFontSize(8);
      muted();
      doc.text(L.page(p, total), W - M, H - 24, { align: "right" });
      const contact = [data.business?.phone, data.business?.email].filter(Boolean).join(" · ");
      if (contact) doc.text(contact, M, H - 24);
      ink();
    }
  };

  const newPage = () => {
    doc.addPage();
    page += 1;
    drawBusinessHeader(true);
    drawTableHeader();
  };

  /* ------------------------------ page 1 ------------------------------ */
  drawBusinessHeader();

  // Bill to card + status
  const billTop = y;
  const billLines = [
    data.customer.mobile ? `${L.mobile}: ${data.customer.mobile}` : null,
    [data.customer.address, data.customer.city].filter(Boolean).join(", ") || null,
    data.customer.email ? `${L.email}: ${data.customer.email}` : null,
    data.customer.gst ? `${L.gst}: ${data.customer.gst}` : null,
  ].filter(Boolean) as string[];
  const billH = 42 + billLines.length * 12;
  doc.setFillColor(SOFT.r, SOFT.g, SOFT.b);
  doc.roundedRect(M, billTop, CW * 0.58, billH, 6, 6, "F");
  setFont("bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(L.billTo.toUpperCase(), M + 12, billTop + 17);
  ink();
  doc.setFontSize(11.5);
  doc.text(data.customer.name, M + 12, billTop + 34, { maxWidth: CW * 0.58 - 24 });
  setFont();
  doc.setFontSize(9);
  muted();
  let by = billTop + 48;
  billLines.forEach((line) => {
    doc.text(line, M + 12, by, { maxWidth: CW * 0.58 - 24 });
    by += 12;
  });
  ink();

  drawStatusPill(billTop + 2);
  setFont("bold");
  doc.setFontSize(9);
  muted();
  doc.text(L.total.toUpperCase(), W - M, billTop + 46, { align: "right" });
  ink();
  doc.setFontSize(17);
  doc.text(money(data.total), W - M, billTop + 66, { align: "right" });
  setFont();

  y = billTop + Math.max(billH, 76) + 20;

  /* ------------------------------ items ------------------------------ */
  drawTableHeader();

  const bottomLimit = H - 70;
  data.lines.forEach((line, idx) => {
    const nameW = cols.sku - cols.name - 10;
    const nameLines = doc.splitTextToSize(line.name, nameW) as string[];
    const descLines = line.description
      ? (doc.splitTextToSize(line.description, nameW) as string[]).slice(0, 2)
      : [];
    const rowH = Math.max(22, nameLines.length * 12 + descLines.length * 10 + 10);

    if (y + rowH > bottomLimit) newPage();

    if (idx % 2 === 1) {
      doc.setFillColor(249, 251, 250);
      doc.rect(M, y, CW, rowH, "F");
    }
    doc.setFontSize(9.5);
    ink();
    setFont();
    const base = y + 14;
    doc.text(String(idx + 1), cols.no, base);
    nameLines.forEach((l, i) => doc.text(l, cols.name, base + i * 12));
    if (descLines.length) {
      muted();
      doc.setFontSize(8);
      descLines.forEach((l, i) => doc.text(l, cols.name, base + nameLines.length * 12 + i * 10));
      doc.setFontSize(9.5);
      ink();
    }
    if (line.sku) {
      muted();
      doc.text(String(line.sku), cols.sku, base, { maxWidth: cols.unit - cols.sku - 8 });
      ink();
    }
    doc.text(line.unit, cols.unit, base, { maxWidth: cols.qty - cols.unit - 8 });
    doc.text(qty(line.quantity), cols.qty, base, { align: "right" });
    doc.text(money(line.rate), cols.rate, base, { align: "right" });
    setFont("bold");
    doc.text(money(line.amount), cols.amount, base, { align: "right" });
    setFont();

    y += rowH;
    doc.setDrawColor(232);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
  });

  y += 22;

  /* ------------------------- totals & tail blocks ------------------------- */
  const totalsRows: [string, string, boolean][] = [[L.subtotal, money(data.subtotal), false]];
  if (data.discount > 0) totalsRows.push([L.discount, `- ${money(data.discount)}`, false]);
  if (data.tax && data.tax > 0) totalsRows.push([L.tax, money(data.tax), false]);
  const totalsH = 34 + totalsRows.length * 16 + 3 * 18;

  if (y + totalsH > bottomLimit) {
    doc.addPage();
    page += 1;
    drawBusinessHeader(true);
  }

  const boxW = CW * 0.46;
  const boxX = W - M - boxW;
  const boxY = y;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.8);
  doc.setFillColor(252, 253, 252);
  doc.roundedRect(boxX, boxY, boxW, totalsH, 6, 6, "FD");

  let ty = boxY + 22;
  const row = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    setFont(opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 9.5);
    doc.text(label, boxX + 14, ty);
    doc.text(value, boxX + boxW - 14, ty, { align: "right" });
    setFont();
  };
  totalsRows.forEach(([label, value]) => {
    muted();
    row(label, value);
    ink();
    ty += 16;
  });
  ty += 2;
  doc.setDrawColor(LINE);
  doc.line(boxX + 12, ty - 10, boxX + boxW - 12, ty - 10);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  row(L.total, money(data.total), { bold: true, size: 12.5 });
  ink();
  ty += 20;
  row(L.paid, money(data.paid));
  ty += 17;
  if (data.pending > 0.009) doc.setTextColor(178, 52, 45);
  row(L.pending, money(data.pending), { bold: true });
  ink();

  // left column: payments / balance / notes / terms
  let ly = boxY;
  const leftW = CW * 0.5;

  const sectionTitle = (title: string) => {
    setFont("bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(title.toUpperCase(), M, ly);
    ink();
    setFont();
    doc.setFontSize(8.5);
    ly += 13;
  };

  const ensureSpace = (need: number) => {
    if (ly + need > bottomLimit) {
      doc.addPage();
      page += 1;
      drawBusinessHeader(true);
      ly = y;
    }
  };

  if (data.payments && data.payments.length > 0) {
    sectionTitle(L.paymentDetails);
    data.payments.forEach((p) => {
      ensureSpace(14);
      muted();
      const ref = p.reference ? ` · ${L.reference}: ${p.reference}` : "";
      doc.text(`${formatDate(p.date)} · ${p.method}${ref}`, M, ly, { maxWidth: leftW - 90 });
      ink();
      doc.text(money(p.amount), M + leftW - 10, ly, { align: "right" });
      ly += 13;
    });
    ly += 8;
  }

  if (data.customerOutstanding !== null && data.customerOutstanding !== undefined) {
    ensureSpace(30);
    muted();
    doc.setFontSize(8.5);
    doc.text(`${L.invoicePending}: `, M, ly);
    ink();
    doc.text(money(data.pending), M + 110, ly);
    ly += 12;
    muted();
    doc.text(`${L.customerOutstanding}: `, M, ly);
    ink();
    doc.text(money(data.customerOutstanding), M + 110, ly);
    ly += 20;
  }

  if (data.notes && String(data.notes).trim()) {
    ensureSpace(32);
    sectionTitle(L.notes);
    muted();
    const notes = doc.splitTextToSize(String(data.notes).trim(), leftW) as string[];
    notes.forEach((l) => {
      doc.text(l, M, ly);
      ly += 11;
    });
    ink();
    ly += 8;
  }

  if (L.termLines.length > 0) {
    ensureSpace(20 + L.termLines.length * 11);
    sectionTitle(L.terms);
    muted();
    L.termLines.forEach((tl) => {
      const wrapped = doc.splitTextToSize(`• ${tl}`, leftW) as string[];
      wrapped.forEach((l) => {
        doc.text(l, M, ly);
        ly += 11;
      });
    });
    ink();
  }

  // footer message
  let fy = Math.max(ly, boxY + totalsH) + 26;
  if (fy > H - 60) {
    doc.addPage();
    page += 1;
    drawBusinessHeader(true);
    fy = y;
  }
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.8);
  doc.line(M, fy - 14, W - M, fy - 14);
  setFont("bold");
  doc.setFontSize(10.5);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(data.business?.invoice_footer || L.thankYou, W / 2, fy + 2, { align: "center", maxWidth: CW });
  ink();
  setFont();

  if (data.cancelled) {
    doc.setPage(1);
    doc.setTextColor(220, 120, 120);
    setFont("bold");
    doc.setFontSize(52);
    doc.text(L.cancelled.toUpperCase(), W / 2, H / 2, { align: "center", angle: 28 });
    ink();
    setFont();
  }

  drawFooters();
  return doc;
}

export function invoiceFileName(data: InvoiceData): string {
  const biz = (data.business?.business_name || "Invoice")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${data.invoiceNo}-${biz}.pdf`;
}

export function invoiceWhatsappMessage(data: InvoiceData, money?: (v: number) => string): string {
  const fmt =
    money ??
    ((v: number) =>
      `\u20B9${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  return data.labels.waMessage({
    name: data.customer.name,
    business: data.business?.business_name || "",
    invoice: data.invoiceNo,
    total: fmt(data.total),
    paid: fmt(data.paid),
    pending: fmt(data.pending),
  });
}

export async function invoiceBlobUrl(data: InvoiceData): Promise<string> {
  const doc = await buildInvoicePdf(data);
  return URL.createObjectURL(doc.output("blob") as Blob);
}

export async function downloadInvoicePdf(data: InvoiceData) {
  const doc = await buildInvoicePdf(data);
  doc.save(invoiceFileName(data));
}

export async function printInvoicePdf(data: InvoiceData) {
  const doc = await buildInvoicePdf(data);
  const url = URL.createObjectURL(doc.output("blob") as Blob);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = url;
  document.body.appendChild(frame);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => {
      document.body.removeChild(frame);
      URL.revokeObjectURL(url);
    }, 60_000);
  };
}

export async function shareInvoice(data: InvoiceData, message: string, whatsappNumber?: string | null) {
  const doc = await buildInvoicePdf(data);
  const blob = doc.output("blob") as Blob;
  const name = invoiceFileName(data);
  const file = new File([blob], name, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
    share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: data.invoiceNo, text: message });
      return "shared" as const;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled" as const;
    }
  }

  doc.save(name);
  const digits = (whatsappNumber ?? "").replace(/\D/g, "");
  const url = digits
    ? `https://wa.me/${digits.length > 10 ? digits : `91${digits}`}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
  return "downloaded" as const;
}
