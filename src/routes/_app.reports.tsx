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
  fetchBusinessMonthly,
  fetchBusinessSummary,
  fetchCustomerSummaries,
  fetchInventory,
  fetchSaleItemsNet,
} from "@/lib/data";
import { exportWorkbook } from "@/lib/excel";
import {
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
  const [preset, setPreset] = useState<RangePreset>("all");
  const [range, setRange] = useState<DateRange>(presetRange("all"));
  const [busy, setBusy] = useState(false);

  const rangeArg = preset === "all" ? undefined : range;
  const summary = useQuery({ queryKey: ["summary", rangeArg ?? "all"], queryFn: () => fetchBusinessSummary(rangeArg) });
  const series = useQuery({ queryKey: ["summary-monthly", rangeArg ?? "all"], queryFn: () => fetchBusinessMonthly(rangeArg) });
  const items = useQuery({ queryKey: ["sale-items-net", rangeArg ?? "all"], queryFn: () => fetchSaleItemsNet({ range: rangeArg }) });
  const customers = useQuery({ queryKey: ["customer-summaries"], queryFn: fetchCustomerSummaries });

  const totals = summary.data;
  const margin = totals && totals.net_sales ? (totals.net_profit / totals.net_sales) * 100 : 0;
  const monthly = useMemo(() => [...(series.data ?? [])].reverse(), [series.data]);
  const productNames = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });

  const topProducts = useMemo(() => {
    const names = new Map((productNames.data ?? []).map((p) => [p.id, p.name]));
    const map = new Map<string, { name: string; quantity: number; amount: number; cogs: number; profit: number }>();
    (items.data ?? [])
      .filter((it) => it.status === "ACTIVE")
      .forEach((it) => {
        const row = map.get(it.product_id) ?? { name: names.get(it.product_id) ?? "—", quantity: 0, amount: 0, cogs: 0, profit: 0 };
        row.quantity += num(it.remaining_quantity);
        row.amount += num(it.net_amount);
        row.cogs += num(it.net_cogs);
        row.profit += num(it.net_profit);
        map.set(it.product_id, row);
      });
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [items.data, productNames.data]);

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

  const loading = summary.isLoading || series.isLoading;

  return (
    <div className="w-full min-w-0 max-w-full">
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
        <StatCard label={t("fin.netSales")} value={money(totals?.net_sales ?? 0)} hint={`${totals?.orders ?? 0}`} />
        <StatCard label={t("fin.returned")} value={money(totals?.returns_amount ?? 0)} />
        <StatCard label={t("fin.cogs")} value={money(totals?.net_cogs ?? 0)} />
        <StatCard label={t("dashboard.profit")} value={money(totals?.net_profit ?? 0)} tone="success" />
        <StatCard label={t("reports.profitMargin")} value={`${margin.toFixed(1)}%`} tone="success" />
        <StatCard label={t("dashboard.totalReceived")} value={money(totals?.received ?? 0)} tone="success" />
        <StatCard label={t("dashboard.pending")} value={money(totals?.pending ?? 0)} tone="danger" />
        <StatCard label={t("fin.credit")} value={money(totals?.credit_due ?? 0)} />
        <StatCard label={t("fin.purchases")} value={money(totals?.purchases ?? 0)} />
        <StatCard label={t("dashboard.stockInvestment")} value={money(totals?.stock_investment ?? 0)} />
        <StatCard label={t("reports.currentStock")} value={money(totals?.stock_value ?? 0)} />
        <StatCard label={t("fin.cancelledOrders")} value={`${totals?.cancelled_orders ?? 0}`} hint={money(totals?.cancelled_amount ?? 0)} />
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
                {monthly.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{monthLabel(row.month)}</TableCell>
                    <TableCell className="text-right">{row.orders}</TableCell>
                    <TableCell className="text-right">{money(row.net_sales)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {money(row.net_profit)}
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
