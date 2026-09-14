import {
  fetchCustomerSummaries,
  fetchInventory,
  isValidReceivedPayment,
  fetchPayments,
  fetchProducts,
  fetchPurchases,
  fetchReturns,
  fetchSales,
} from "@/lib/data";
import { num, presetRange } from "@/lib/format";

export async function fetchDashboardData() {
  const [products, inventory, customers, sales, purchases, payments] = await Promise.all([
    fetchProducts(false),
    fetchInventory(),
    fetchCustomerSummaries(),
    fetchSales({ status: "ACTIVE" }),
    fetchPurchases(),
    fetchPayments(),
  ]);

  const today = presetRange("today");
  const month = presetRange("thisMonth");

  const todaySales = sales.filter((s) => s.sale_date >= today.from && s.sale_date <= today.to);
  const monthSales = sales.filter((s) => s.sale_date >= month.from && s.sale_date <= month.to);

  const monthlyMap = new Map<string, { sales: number; profit: number }>();
  sales.forEach((s) => {
    const key = s.sale_date.slice(0, 7);
    const cur = monthlyMap.get(key) ?? { sales: 0, profit: 0 };
    cur.sales += num(s.total);
    cur.profit += num(s.profit);
    monthlyMap.set(key, cur);
  });

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, v]) => ({ month: key, ...v }));

  return {
    counts: {
      products: products.length,
      customers: customers.length,
      totalStock: inventory.reduce((a, p) => a + num(p.current_stock), 0),
      stockInvestment: inventory.reduce((a, p) => a + num(p.total_investment), 0),
      stockValue: inventory.reduce((a, p) => a + num(p.stock_value), 0),
      totalSales: sales.reduce((a, s) => a + num(s.total), 0),
      totalReceived: payments.filter(isValidReceivedPayment).reduce((a, p) => a + num(p.amount), 0),
      totalPending: sales.reduce((a, s) => a + num(s.pending_amount), 0),
      totalProfit: sales.reduce((a, s) => a + num(s.profit), 0),
      purchaseInvestment: purchases.reduce((a, p) => a + num(p.total_amount), 0),
    },
    today: {
      sales: todaySales.reduce((a, s) => a + num(s.total), 0),
      profit: todaySales.reduce((a, s) => a + num(s.profit), 0),
    },
    month: {
      sales: monthSales.reduce((a, s) => a + num(s.total), 0),
      profit: monthSales.reduce((a, s) => a + num(s.profit), 0),
    },
    monthly,
    topProducts: [...inventory]
      .filter((p) => p.active)
      .sort((a, b) => num(b.total_revenue) - num(a.total_revenue))
      .slice(0, 5),
    topCustomers: [...customers]
      .sort((a, b) => num(b.total_purchased) - num(a.total_purchased))
      .slice(0, 5),
    pendingCustomers: customers
      .filter((c) => num(c.total_pending) > 0)
      .sort((a, b) => num(b.total_pending) - num(a.total_pending))
      .slice(0, 5),
    lowStock: inventory.filter((p) => p.is_low_stock && p.active),
    recentSales: sales.slice(0, 8),
  };
}

export async function fetchReportData(range: { from: string; to: string }) {
  const [inventory, sales, cancelledSales, purchases, customers, saleItems, returns] = await Promise.all([
    fetchInventory(),
    fetchSales({ range, status: "ACTIVE" }),
    fetchSales({ range, status: "CANCELLED" }),
    fetchPurchases(range),
    fetchCustomerSummaries(),
    import("@/lib/data").then((m) => m.fetchSaleItems({ range })),
    fetchReturns(range),
  ]);

  const revenue = sales.reduce((a, s) => a + num(s.total), 0);
  const cogs = sales.reduce((a, s) => a + num(s.cogs), 0);
  const profit = sales.reduce((a, s) => a + num(s.profit), 0);
  const received = sales.reduce((a, s) => a + num(s.paid_amount), 0);
  const pending = sales.reduce((a, s) => a + num(s.pending_amount), 0);

  const productMap = new Map<
    string,
    { name: string; qty: number; revenue: number; profit: number }
  >();
  saleItems.forEach((i) => {
    const id = i.product_id;
    const cur = productMap.get(id) ?? {
      name: i.products?.name ?? "-",
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    cur.qty += num(i.quantity) - num(i.returned_quantity);
    cur.revenue += num(i.amount);
    cur.profit += num(i.profit);
    productMap.set(id, cur);
  });

  const customerMap = new Map<
    string,
    { name: string; orders: number; revenue: number; profit: number; pending: number }
  >();
  sales.forEach((s) => {
    const id = s.customer_id;
    const cur = customerMap.get(id) ?? {
      name: s.customers?.name ?? "-",
      orders: 0,
      revenue: 0,
      profit: 0,
      pending: 0,
    };
    cur.orders += 1;
    cur.revenue += num(s.total);
    cur.profit += num(s.profit);
    cur.pending += num(s.pending_amount);
    customerMap.set(id, cur);
  });

  const monthlyMap = new Map<string, { sales: number; profit: number; orders: number }>();
  sales.forEach((s) => {
    const key = s.sale_date.slice(0, 7);
    const cur = monthlyMap.get(key) ?? { sales: 0, profit: 0, orders: 0 };
    cur.sales += num(s.total);
    cur.profit += num(s.profit);
    cur.orders += 1;
    monthlyMap.set(key, cur);
  });

  return {
    summary: {
      stockPurchased: purchases.reduce((a, p) => a + num(p.quantity), 0),
      purchaseInvestment: purchases.reduce((a, p) => a + num(p.total_amount), 0),
      stockSold: saleItems.reduce((a, i) => a + num(i.quantity) - num(i.returned_quantity), 0),
      salesRevenue: revenue,
      currentStock: inventory.reduce((a, p) => a + num(p.current_stock), 0),
      currentStockValue: inventory.reduce((a, p) => a + num(p.stock_value), 0),
      revenue,
      netSales: revenue,
      cogs,
      profit,
      netProfit: profit,
      profitMargin: revenue ? (profit / revenue) * 100 : 0,
      received,
      pending,
      customers: customers.length,
      orders: sales.length,
      cancelledOrders: cancelledSales.length,
      returnAmount: returns.reduce((a, item) => a + num(item.total_amount), 0),
    },
    products: [...productMap.values()].sort((a, b) => b.revenue - a.revenue),
    customers: [...customerMap.values()].sort((a, b) => b.revenue - a.revenue),
    monthly: [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
  };
}
