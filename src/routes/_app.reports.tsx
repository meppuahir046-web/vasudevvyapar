import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Loading, PageHeader, RangeFilter, StatCard } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import {
  fetchCustomerSummaries,
  fetchInventory,
  fetchPayments,
  fetchPurchases,
  fetchSaleItems,
  fetchSales,
} from "@/lib/data";
import { exportWorkbook } from "@/lib/excel";
import {
  monthKey,
  monthLabel,
  money,
  num,
  presetRange,
  qty,
  type DateRange,
  type RangePreset,
} from "@/lib/format";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Excel Export — RetailBook" },
      {
        name: "description",
        content:
          "Monthly sales, profit, stock-in and payment reports for your retail business with one-click Excel export.",
      },
      { property: "og:title", content: "Reports & Excel Export — RetailBook" },
      { property: "og:description", content: "Analyse sales, profit margin, dues and stock movement by period." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t } = useI18n();
  const [preset, setPreset] = useState<RangePreset>("thisMonth");
  const [range, setRange] = useState<DateRange>(presetRange("thisMonth"));
  const [busy, setBusy] = useState(false);

  const sales = useQuery({ queryKey: ["sales", range], queryFn: () => fetchSales({ range }) });
  const items = useQuery({ queryKey: ["saleItems", range], queryFn: () => fetchSaleItems({ range }) });
  const payments = useQuery({ queryKey: ["payments", range], queryFn: () => fetchPayments({ range }) });
  const purchases = useQuery({ queryKey: ["purchases", range], queryFn: () => fetchPurchases(range) });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
  const customers = useQuery({ queryKey: ["customerSummaries"], queryFn: fetchCustomerSummaries });

  const active = useMemo(
    () => (sales.data ?? []).filter((s) => s.status === "ACTIVE"),
    [sales.data],
  );

  const totals = useMemo(() => {
    const sold = active.reduce((a, s) => a + num(s.total), 0);
    const profit = active.reduce((a, s) => a + num(s.profit), 0);
    const received = (payments.data ?? []).reduce((a, p) => a + num(p.amount), 0);
    const pending = active.reduce((a, s) => a + num(s.pending_amount), 0);
    const stockIn = (purchases.data ?? []).reduce((a, p) => a + num(p.total_amount), 0);
    const stockValue = (inventory.data ?? []).reduce((a, r) => a + num(r.stock_value), 0);
    const activeCustomers = new Set(active.map((s) => s.customer_id)).size;
    return { sold, profit, received, pending, stockIn, stockValue, activeCustomers, margin: sold ? (profit / sold) * 100 : 0 };
  }, [active, payments.data, purchases.data, inventory.data]);

  const monthly = useMemo(() => {
    const map = new Map<string, { sales: number; profit: number; count: number; received: number }>();
    active.forEach((s) => {
      const k = monthKey(s.sale_date);
      const row = map.get(k) ?? { sales: 0, profit: 0, count: 0, received: 0 };
      row.sales += num(s.total);
      row.profit += num(s.profit);
      row.count += 1;
      map.set(k, row);
    });
    (payments.data ?? []).forEach((p) => {
      const k = monthKey(p.paid_at);
      const row = map.get(k) ?? { sales: 0, profit: 0, count: 0, received: 0 };
      row.received += num(p.amount);
      map.set(k, row);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [active, payments.data]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; amount: number; profit: number }>();
    (items.data ?? []).forEach((it) => {
      const id = it.product_id;
      const row = map.get(id) ?? { name: it.products?.name ?? "—", quantity: 0, amount: 0, profit: 0 };
      row.quantity += num(it.quantity) - num(it.returned_quantity);
      row.amount += num(it.amount);
      row.profit += num(it.profit);
      map.set(id, row);
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [items.data]);

  const topCustomers = useMemo(
    () => [...(customers.data ?? [])].sort((a, b) => num(b.total_purchased) - num(a.total_purchased)).slice(0, 10),
    [customers.data],
  );

  const doExport = async (r: DateRange, label: string) => {
    setBusy(true);
    try {
      await exportWorkbook(r, label);
      toast.success(t("reports.exported"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const loading = sales.isLoading || items.isLoading || payments.isLoading;

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.monthlySummary")}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => doExport(range, "range")}>
              {t("reports.exportRange")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => doExport(presetRange("thisMonth"), "this-month")}
            >
              {t("reports.exportThisMonth")}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => doExport(presetRange("all"), "full-history")}>
              {t("reports.exportFull")}
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <RangeFilter
            preset={preset}
            range={range}
            onChange={(p, r) => {
              setPreset(p);
              setRange(r);
            }}
          />
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("dashboard.totalSales")} value={money(totals.sold)} hint={`${active.length}`} />
        <StatCard label={t("dashboard.profit")} value={money(totals.profit)} tone="success" />
        <StatCard label={t("reports.profitMargin")} value={`${totals.margin.toFixed(1)}%`} tone="success" />
        <StatCard label={t("dashboard.pending")} value={money(totals.pending)} tone="danger" />
        <StatCard label={t("reports.payments")} value={money(totals.received)} />
        <StatCard label={t("reports.stockIn")} value={money(totals.stockIn)} />
        <StatCard label={t("reports.currentStock")} value={money(totals.stockValue)} />
        <StatCard label={t("reports.activeCustomers")} value={String(totals.activeCustomers)} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">{t("reports.monthlyReport")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : monthly.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.monthlySummary")}</TableHead>
                  <TableHead className="text-right">{t("nav.sales")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.totalSales")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.profit")}</TableHead>
                  <TableHead className="text-right">{t("reports.payments")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map(([key, row]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{monthLabel(key)}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{money(row.sales)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {money(row.profit)}
                    </TableCell>
                    <TableCell className="text-right">{money(row.received)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reports.products")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.products")}</TableHead>
                    <TableHead className="text-right">{t("reports.stockOut")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.totalSales")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.profit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{qty(p.quantity)}</TableCell>
                      <TableCell className="text-right">{money(p.amount)}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {money(p.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reports.customers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports.customers")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.totalSales")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.pending")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right">{money(c.total_purchased)}</TableCell>
                      <TableCell className="text-right text-destructive">{money(c.total_pending)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
