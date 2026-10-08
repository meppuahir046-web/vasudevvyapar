import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from "@/components/ui-bits";
import {
  fetchBusinessMonthly,
  fetchBusinessSummary,
  fetchCustomerSummaries,
  fetchInventory,
  fetchSales,
  saleFinancialStatus,
} from "@/lib/data";
import { formatDate, money, monthLabel, num, presetRange, qty } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RetailBook Retail Manager" },
      {
        name: "description",
        content: "Live view of sales, profit, stock investment, pending payments and low-stock alerts for your retail shop.",
      },
      { property: "og:title", content: "Dashboard — RetailBook Retail Manager" },
      { property: "og:description", content: "Sales, profit, stock and dues at a glance." },
    ],
  }),
  component: DashboardPage,
});

function compact(v: number) {
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}

const kpiLink =
  "block min-w-0 cursor-pointer rounded-xl transition hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]";

function DashboardPage() {
  const { t } = useI18n();
  const today = presetRange("today");
  const month = presetRange("thisMonth");
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
  const all = useQuery({ queryKey: ["summary", "all"], queryFn: () => fetchBusinessSummary() });
  const todayS = useQuery({ queryKey: ["summary", today], queryFn: () => fetchBusinessSummary(today) });
  const monthS = useQuery({ queryKey: ["summary", month], queryFn: () => fetchBusinessSummary(month) });
  const series = useQuery({ queryKey: ["summary-monthly", "all"], queryFn: () => fetchBusinessMonthly() });
  const sales = useQuery({ queryKey: ["sales", "recent"], queryFn: () => fetchSales({ status: "ACTIVE" }) });
  const customers = useQuery({ queryKey: ["customer-summaries"], queryFn: fetchCustomerSummaries });

  if (inventory.isLoading || all.isLoading) return <Loading />;

  const inv = inventory.data ?? [];
  const sum0 = all.data;
  const active = sales.data ?? [];
  const lowStock = inv.filter((p) => p.is_low_stock && p.active);

  const monthly = (series.data ?? []).slice(-12).map((r) => ({
    key: r.month,
    label: monthLabel(r.month),
    sales: r.net_sales,
    profit: r.net_profit,
  }));

  const productSales = inv
    .filter((p) => num(p.total_revenue) > 0)
    .map((p) => ({ name: p.name, amount: num(p.total_revenue) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const topCustomers = [...(customers.data ?? [])].sort((a, b) => num(b.total_purchased) - num(a.total_purchased)).slice(0, 5);
  const pendingCustomers = (customers.data ?? []).filter((c) => num(c.total_pending) > 0.009);

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <PageHeader title={t("dashboard.title")} subtitle={t("app.tagline")} />

      {lowStock.length > 0 && (
        <Link
          to="/inventory"
          className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangle className="size-4" />
          {t("dashboard.lowStockAlert", { n: lowStock.length })}
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Link to="/sales" search={{ range: "today" }} className={kpiLink}>
          <StatCard label={t("dashboard.todaySales")} value={money(todayS.data?.net_sales ?? 0)} />
        </Link>
        <Link to="/reports" search={{ range: "today" }} className={kpiLink}>
          <StatCard label={t("dashboard.todayProfit")} value={money(todayS.data?.net_profit ?? 0)} tone="success" />
        </Link>
        <Link to="/sales" search={{ range: "thisMonth" }} className={kpiLink}>
          <StatCard label={t("dashboard.monthSales")} value={money(monthS.data?.net_sales ?? 0)} />
        </Link>
        <Link to="/reports" search={{ range: "thisMonth" }} className={kpiLink}>
          <StatCard label={t("dashboard.monthProfit")} value={money(monthS.data?.net_profit ?? 0)} tone="success" />
        </Link>
        <Link to="/sales" search={{ range: "all" }} className={kpiLink}>
          <StatCard label={t("dashboard.totalSales")} value={money(sum0?.net_sales ?? 0)} />
        </Link>
        <Link to="/payments" className={kpiLink}>
          <StatCard label={t("dashboard.totalReceived")} value={money(sum0?.received ?? 0)} tone="success" />
        </Link>
        <Link to="/payments" className={kpiLink}>
          <StatCard label={t("dashboard.totalPending")} value={money(sum0?.pending ?? 0)} tone="danger" />
        </Link>
        <Link to="/payments" className={kpiLink}>
          <StatCard label={t("fin.credit")} value={money(sum0?.credit_due ?? 0)} />
        </Link>
        <Link to="/reports" search={{ range: "all" }} className={kpiLink}>
          <StatCard label={t("dashboard.totalProfit")} value={money(sum0?.net_profit ?? 0)} tone="success" />
        </Link>
        <Link to="/products" className={kpiLink}>
          <StatCard label={t("dashboard.totalProducts")} value={String(sum0?.products ?? 0)} />
        </Link>
        <Link to="/customers" className={kpiLink}>
          <StatCard label={t("dashboard.totalCustomers")} value={String(sum0?.customers ?? 0)} />
        </Link>
        <Link to="/purchases" className={kpiLink}>
          <StatCard label={t("dashboard.stockInvestment")} value={money(sum0?.stock_investment ?? 0)} />
        </Link>
        <Link to="/inventory" className={kpiLink}>
          <StatCard label={t("dashboard.stockValue")} value={money(sum0?.stock_value ?? 0)} />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-base">{t("dashboard.monthlySales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-52 px-1 pb-3 sm:px-4 lg:h-64">
            {monthly.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={10} tickMargin={4} />
                  <YAxis fontSize={10} width={44} tickFormatter={(v: number) => compact(v)} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Line type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm lg:text-base">{t("dashboard.productSales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-52 px-1 pb-3 sm:px-4 lg:h-64">
            {productSales.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productSales} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    fontSize={9}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={52}
                    tickFormatter={(v: string) => (v.length > 9 ? `${v.slice(0, 8)}…` : v)}
                  />
                  <YAxis fontSize={10} width={44} tickFormatter={(v: number) => compact(v)} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentSales")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.invoice")}</TableHead>
                  <TableHead>{t("common.customer")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.slice(0, 8).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link to="/sales/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">
                        {s.invoice_no}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(s.sale_date)}</p>
                    </TableCell>
                    <TableCell className="text-sm">{s.customers?.name}</TableCell>
                    <TableCell className="text-right text-sm">{money(s.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={saleFinancialStatus(s)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {active.length === 0 && <EmptyState />}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.topCustomers")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topCustomers.length === 0 && <EmptyState />}
              {topCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <Link to="/customers/$id" params={{ id: c.id }} className="text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span>{money(c.total_purchased)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.pendingPayments")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingCustomers.length === 0 && <EmptyState />}
              {pendingCustomers.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <Link to="/customers/$id" params={{ id: c.id }} className="text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-destructive">{money(c.total_pending)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.lowStock")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.length === 0 && <EmptyState />}
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {qty(p.current_stock)} {t(`unit.${p.unit}`)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
