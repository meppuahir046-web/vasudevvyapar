import * as XLSX from "xlsx";
import {
  fetchCustomerSummaries,
  fetchInventory,
  fetchLedger,
  fetchPayments,
  fetchProducts,
  fetchPurchases,
  fetchReturns,
  fetchSaleItems,
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

export async function exportWorkbook(range: DateRange, fileLabel: string) {
  const [settings, products, inventory, purchases, sales, saleItems, payments, customers, returns, ledger] =
    await Promise.all([
      fetchSettings(),
      fetchProducts(),
      fetchInventory(),
      fetchPurchases(range),
      fetchSales({ range }),
      fetchSaleItems({ range }),
      fetchPayments({ range }),
      fetchCustomerSummaries(),
      fetchReturns(range),
      fetchLedger(undefined, range),
    ]);

  const activeSales = sales.filter((s) => s.status === "ACTIVE");

  // Monthly summary
  const byMonth = new Map<string, { sales: number; profit: number; paid: number; pending: number; orders: number }>();
  activeSales.forEach((s) => {
    const key = monthKey(s.sale_date);
    const cur = byMonth.get(key) ?? { sales: 0, profit: 0, paid: 0, pending: 0, orders: 0 };
    cur.sales += num(s.total);
    cur.profit += num(s.profit);
    cur.paid += num(s.paid_amount);
    cur.pending += num(s.pending_amount);
    cur.orders += 1;
    byMonth.set(key, cur);
  });

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
        { Metric: "Orders", Value: activeSales.length },
        { Metric: "Sales Total", Value: moneyPlain(activeSales.reduce((a, s) => a + num(s.total), 0)) },
        { Metric: "Received", Value: moneyPlain(activeSales.reduce((a, s) => a + num(s.paid_amount), 0)) },
        { Metric: "Pending", Value: moneyPlain(activeSales.reduce((a, s) => a + num(s.pending_amount), 0)) },
        { Metric: "Gross Profit", Value: moneyPlain(activeSales.reduce((a, s) => a + num(s.profit), 0)) },
        { Metric: "Stock Purchases", Value: moneyPlain(purchases.reduce((a, p) => a + num(p.total_amount), 0)) },
        { Metric: "Stock Value", Value: moneyPlain(inventory.reduce((a, p) => a + num(p.stock_value), 0)) },
      ],
    },
    {
      name: "Monthly Summary",
      rows: [...byMonth.entries()]
        .sort()
        .map(([key, v]) => ({
          Month: monthLabel(key),
          Orders: v.orders,
          Sales: moneyPlain(v.sales),
          Received: moneyPlain(v.paid),
          Pending: moneyPlain(v.pending),
          Profit: moneyPlain(v.profit),
          "Stock Purchased": moneyPlain(purchasesByMonth.get(key) ?? 0),
          "Margin %": v.sales ? Math.round((v.profit / v.sales) * 1000) / 10 : 0,
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
        Total: moneyPlain(s.total),
        Paid: moneyPlain(s.paid_amount),
        Pending: moneyPlain(s.pending_amount),
        COGS: moneyPlain(s.cogs),
        Profit: moneyPlain(s.profit),
        Status: s.status,
      })),
    },
    {
      name: "Sale Items",
      rows: saleItems.map((i) => ({
        Date: i.sales?.sale_date ?? "",
        Invoice: i.sales?.invoice_no ?? "",
        Customer: i.sales?.customers?.name ?? "",
        Product: i.products?.name ?? "",
        Quantity: num(i.quantity),
        Returned: num(i.returned_quantity),
        Unit: i.unit,
        Rate: moneyPlain(i.rate),
        Amount: moneyPlain(i.amount),
        "Unit Cost": moneyPlain(i.unit_cost),
        Profit: moneyPlain(i.profit),
        Status: i.sales?.status ?? "",
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
        Purchased: moneyPlain(c.total_purchased),
        Paid: moneyPlain(c.total_paid),
        Pending: moneyPlain(c.total_pending),
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

  XLSX.writeFile(wb, `RetailBook-${fileLabel}.xlsx`);
}
