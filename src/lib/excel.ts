import * as XLSX from "xlsx";
import { MIME, androidBridge } from "./native-bridge";

import {
  fetchBusinessMonthly,
  fetchBusinessSummary,
  fetchCustomerSummaries,
  fetchInventory,
  fetchLedger,
  fetchPayments,
  fetchProducts,
  fetchPurchases,
  fetchReturns,
  fetchSaleItemsNet,
  fetchSales,
  fetchSettings,
} from "./data";
import { monthKey, monthLabel, moneyPlain, num, type DateRange } from "./format";

type Sheet = { name: string; rows: Record<string, unknown>[] };

function addSheets(wb: XLSX.WorkBook, sheets: Sheet[]) {
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No data" }]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
}

export async function exportWorkbook(range: DateRange, fileLabel: string, delivery: "download" | "share" = "download") {
  const [settings, products, inventory, purchases, sales, summary, monthly, saleItems, payments, customers, returns, ledger] =
    await Promise.all([
      fetchSettings(),
      fetchProducts(),
      fetchInventory(),
      fetchPurchases(range),
      fetchSales({ range }),
      fetchBusinessSummary(range),
      fetchBusinessMonthly(range),
      fetchSaleItemsNet({ range }),
      fetchPayments({ range }),
      fetchCustomerSummaries(),
      fetchReturns(range),
      fetchLedger(undefined, range),
    ]);

  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const purchasesByMonth = new Map<string, number>();
  purchases.forEach((p) => {
    const key = monthKey(p.purchase_date);
    purchasesByMonth.set(key, (purchasesByMonth.get(key) ?? 0) + num(p.total_amount));
  });
  const wb = XLSX.utils.book_new();

  addSheets(wb, [
    {
      name: "Summary",
      rows: [
        { Metric: "Business", Value: settings?.business_name ?? "" },
        { Metric: "Period", Value: `${range.from} to ${range.to}` },
        { Metric: "Generated", Value: new Date().toLocaleString("en-GB") },
        { Metric: "Products", Value: products.length },
        { Metric: "Customers", Value: customers.length },
        { Metric: "Orders", Value: summary.orders },
        { Metric: "Gross Sales", Value: moneyPlain(summary.gross_sales) },
        { Metric: "Returns", Value: moneyPlain(summary.returns_amount) },
        { Metric: "Cancelled Sales", Value: moneyPlain(summary.cancelled_amount) },
        { Metric: "Cancelled Orders", Value: summary.cancelled_orders },
        { Metric: "Net Sales", Value: moneyPlain(summary.net_sales) },
        { Metric: "COGS", Value: moneyPlain(summary.net_cogs) },
        { Metric: "Net Profit", Value: moneyPlain(summary.net_profit) },
        { Metric: "Received", Value: moneyPlain(summary.received) },
        { Metric: "Pending", Value: moneyPlain(summary.pending) },
        { Metric: "Credit / Refund Due", Value: moneyPlain(summary.credit_due) },
        { Metric: "Stock Purchases", Value: moneyPlain(summary.purchases) },
        { Metric: "Stock Investment", Value: moneyPlain(summary.stock_investment) },
        { Metric: "Stock Value", Value: moneyPlain(summary.stock_value) },
      ],
    },
    {
      name: "Monthly Summary",
      rows: [...monthly]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((v) => ({
          Month: monthLabel(v.month),
          Orders: v.orders,
          Sales: moneyPlain(v.net_sales),
          Received: moneyPlain(v.received),
          Pending: moneyPlain(v.pending),
          "Credit / Refund Due": moneyPlain(v.credit_due),
          Returns: moneyPlain(v.returns_amount),
          Profit: moneyPlain(v.net_profit),
          "Stock Purchased": moneyPlain(purchasesByMonth.get(v.month) ?? 0),
          "Margin %": v.net_sales ? Math.round((v.net_profit / v.net_sales) * 1000) / 10 : 0,
        })),
    },
    {
      name: "Products",
      rows: products.map((p) => ({
        Name: p.name,
        SKU: p.sku ?? "",
        Brand: p.brand ?? "",
        Unit: p.unit,
        "Default Price": moneyPlain(p.default_price),
        "Min Stock": num(p.min_stock),
        Active: p.active ? "Yes" : "No",
        Description: p.description ?? "",
      })),
    },
    {
      name: "Current Stock",
      rows: inventory.map((p) => ({
        Product: p.name,
        Category: p.category_name ?? "",
        Unit: p.unit,
        Purchased: num(p.total_purchased),
        Sold: num(p.total_sold),
        Available: num(p.current_stock),
        "Avg Cost": moneyPlain(p.avg_cost),
        "Stock Value": moneyPlain(p.stock_value),
        Investment: moneyPlain(p.total_investment),
        Revenue: moneyPlain(p.total_revenue),
        Profit: moneyPlain(p.total_profit),
        "Low Stock": p.is_low_stock ? "Yes" : "No",
      })),
    },
    {
      name: "Stock In",
      rows: purchases.map((p) => ({
        Date: p.purchase_date,
        Product: p.products?.name ?? "",
        Supplier: p.suppliers?.name ?? "",
        Quantity: num(p.quantity),
        Unit: p.unit,
        "Cost/Unit": moneyPlain(p.cost_per_unit),
        Total: moneyPlain(p.total_amount),
        "Invoice No": p.invoice_no ?? "",
        Notes: p.notes ?? "",
      })),
    },
    {
      name: "Sales",
      rows: sales.map((s) => ({
        Date: s.sale_date,
        Invoice: s.invoice_no,
        Customer: s.customers?.name ?? "",
        Mobile: s.customers?.mobile ?? "",
        Subtotal: moneyPlain(s.subtotal),
        Discount: moneyPlain(s.discount),
        Returned: moneyPlain(s.returned_amount),
        Total: moneyPlain(s.status === "CANCELLED" ? 0 : s.total),
        Received: moneyPlain(s.received_amount),
        Pending: moneyPlain(s.pending_amount),
        "Credit / Refund Due": moneyPlain(s.credit_amount),
        COGS: moneyPlain(s.status === "CANCELLED" ? 0 : s.cogs),
        Profit: moneyPlain(s.status === "CANCELLED" ? 0 : s.profit),
        Status: s.status,
      })),
    },
    {
      name: "Sale Items",
      rows: saleItems.map((i) => ({
        Date: i.sale_date,
        Invoice: i.invoice_no,
        Product: productNames.get(i.product_id) ?? i.product_id,
        "Original Qty": num(i.quantity),
        Returned: num(i.returned_quantity),
        Remaining: num(i.remaining_quantity),
        Unit: i.unit,
        Rate: moneyPlain(i.rate),
        "Original Amount": moneyPlain(i.original_amount),
        "Returned Amount": moneyPlain(i.returned_amount),
        "Net Amount": moneyPlain(i.net_amount),
        "Net COGS": moneyPlain(i.net_cogs),
        "Net Profit": moneyPlain(i.net_profit),
        Status: i.status,
      })),
    },
    {
      name: "Payments",
      rows: payments.map((p) => ({
        Date: p.paid_at,
        Customer: p.customers?.name ?? "",
        Invoice: p.sales?.invoice_no ?? "",
        Amount: moneyPlain(p.amount),
        Method: p.method,
        Reference: p.reference ?? "",
        Reversal: p.is_reversal ? "Yes" : "No",
        Notes: p.notes ?? "",
      })),
    },
    {
      name: "Customers",
      rows: customers.map((c) => ({
        Name: c.name,
        Mobile: c.mobile ?? "",
        WhatsApp: c.whatsapp ?? "",
        City: c.city ?? "",
        Address: c.address ?? "",
        Orders: num(c.orders),
        "Net Purchased": moneyPlain(c.total_purchased),
        Received: moneyPlain(c.total_paid),
        Pending: moneyPlain(c.total_pending),
        "Credit / Refund Due": moneyPlain(c.total_credit),
        Returned: moneyPlain(c.total_returned),
        "Cancelled Orders": num(c.cancelled_orders),
        Profit: moneyPlain(c.total_profit),
        "Last Sale": c.last_sale ?? "",
        Active: c.active ? "Yes" : "No",
      })),
    },
    {
      name: "Pending Payments",
      rows: customers
        .filter((c) => num(c.total_pending) > 0)
        .map((c) => ({
          Customer: c.name,
          Mobile: c.mobile ?? "",
          Pending: moneyPlain(c.total_pending),
          "Last Sale": c.last_sale ?? "",
        })),
    },
    {
      name: "Returns",
      rows: returns.map((r) => ({
        Date: r.return_date,
        Invoice: r.sales?.invoice_no ?? "",
        Customer: r.customers?.name ?? "",
        Amount: moneyPlain(r.total_amount),
        Cost: moneyPlain(r.total_cost),
        Items: (r.sale_return_items ?? []).length,
        Notes: r.notes ?? "",
      })),
    },
    {
      name: "Stock Ledger",
      rows: ledger.map((l) => ({
        Date: l.txn_date,
        Product: l.products?.name ?? "",
        Type: l.txn_type,
        Quantity: num(l.quantity),
        Unit: l.products?.unit ?? "",
        "Unit Cost": moneyPlain(l.unit_cost ?? 0),
        Reference: l.reference_type ?? "",
        Notes: l.notes ?? "",
      })),
    },
  ]);

  const name = `RetailBook-${fileLabel}.xlsx`;
  const bridge = androidBridge();
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
  if (bridge?.shareFile && delivery === "share") {
    bridge.shareFile(base64, name, MIME.xlsx, name, "sheet", "");
    return;
  }
  if (bridge?.saveFile) {
    bridge.saveFile(base64, name, MIME.xlsx);
    return;
  }
  if (delivery === "share") {
    const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const file = new File([bytes], name, { type: MIME.xlsx });
    const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean; share?: (d: { files?: File[]; title?: string }) => Promise<void> };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: name });
      return;
    }
  }
  XLSX.writeFile(wb, name);
}

export function shareWorkbook(range: DateRange, fileLabel: string) {
  return exportWorkbook(range, fileLabel, "share");
}
