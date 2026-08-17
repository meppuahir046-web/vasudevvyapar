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
import { fetchCustomerSummaries, fetchInventory, fetchSaleItems, fetchSales } from "@/lib/data";
import { formatDate, money, monthKey, monthLabel, num, paymentStatus, presetRange, qty } from "@/lib/format";
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

function DashboardPage() {
  const { t } = useI18n();
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
  const sales = useQuery({ queryKey: ["sales", "all"], queryFn: () => fetchSales({ range: presetRange("all") }) });
  const customers = useQuery({ queryKey: ["customer-summaries"], queryFn: fetchCustomerSummaries });
  const items = useQuery({ queryKey: ["sale-items", "all"], queryFn: () => fetchSaleItems({ range: presetRange("all") }) });

  if (inventory.isLoading || sales.isLoading) return <Loading />;

  const inv = inventory.data ?? [];
  const active = (sales.data ?? []).filter((s) => s.status === "ACTIVE");
  const today = presetRange("today").from;
  const month = monthKey(today);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const totalSales = sum(active.map((s) => num(s.total)));
  const totalPaid = sum(active.map((s) => num(s.paid_amount)));
  const totalPending = sum(active.map((s) => num(s.pending_amount)));
  const totalProfit = sum(active.map((s) => num(s.profit)));
  const todaySales = active.filter((s) => s.sale_date === today);
  const monthSales = active.filter((s) => monthKey(s.sale_date) === month);
  const lowStock = inv.filter((p) => p.is_low_stock && p.active);

  const monthly = Object.values(
    active.reduce<Record<string, { key: string; label: string; sales: number; profit: number }>>((acc, s) => {
      const k = monthKey(s.sale_date);
      acc[k] ??= { key: k, label: monthLabel(k), sales: 0, profit: 0 };
      acc[k]!.sales += num(s.total);
      acc[k]!.profit += num(s.profit);
      return acc;
    }, {}),
  )
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);

  const productSales = Object.values(
    (items.data ?? [])
      .filter((i) => i.sales?.status === "ACTIVE")
      .reduce<Record<string, { name: string; amount: number }>>((acc, i) => {
        const name = i.products?.name ?? "-";
        acc[name] ??= { name, amount: 0 };
        acc[name]!.amount += num(i.amount);
        return acc;
      }, {}),
  )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const topCustomers = [...(customers.data ?? [])].sort((a, b) => num(b.total_purchased) - num(a.total_purchased)).slice(0, 5);
  const pendingCustomers = (customers.data ?? []).filter((c) => num(c.total_pending) > 0.009);

  return (
    <div className="space-y-5">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dashboard.todaySales")} value={money(sum(todaySales.map((s) => num(s.total))))} />
        <StatCard
          label={t("dashboard.todayProfit")}
          value={money(sum(todaySales.map((s) => num(s.profit))))}
          tone="success"
        />
        <StatCard label={t("dashboard.monthSales")} value={money(sum(monthSales.map((s) => num(s.total))))} />
        <StatCard
          label={t("dashboard.monthProfit")}
          value={money(sum(monthSales.map((s) => num(s.profit))))}
          tone="success"
        />
        <StatCard label={t("dashboard.totalSales")} value={money(totalSales)} />
        <StatCard label={t("dashboard.totalReceived")} value={money(totalPaid)} tone="success" />
        <StatCard label={t("dashboard.totalPending")} value={money(totalPending)} tone="danger" />
        <StatCard label={t("dashboard.totalProfit")} value={money(totalProfit)} tone="success" />
        <StatCard label={t("dashboard.totalProducts")} value={String(inv.filter((p) => p.active).length)} />
        <StatCard label={t("dashboard.totalCustomers")} value={String((customers.data ?? []).length)} />
        <StatCard
          label={t("dashboard.stockInvestment")}
          value={money(sum(inv.map((p) => num(p.total_investment))))}
        />
        <StatCard label={t("dashboard.stockValue")} value={money(sum(inv.map((p) => num(p.stock_value))))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.monthlySales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {monthly.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.productSales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {productSales.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productSales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={4} />
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
                      <StatusBadge status={paymentStatus(num(s.total), num(s.paid_amount))} />
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
