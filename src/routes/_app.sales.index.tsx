import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Loading, PageHeader, RangeFilter, StatCard, StatusBadge } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { fetchSales } from "@/lib/data";
import { formatDate, money, num, presetRange, type DateRange, type RangePreset } from "@/lib/format";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Invoices — RetailBook" },
      { name: "description", content: "Browse every sale invoice with totals, payment status, profit and date filters." },
      { property: "og:title", content: "Sales & Invoices — RetailBook" },
      { property: "og:description", content: "Sales register with payment status, profit and invoice search." },
    ],
  }),
  component: SalesPage,
});

function statusOf(s: { status: string; total: number; paid_amount: number }) {
  if (s.status === "CANCELLED") return "cancelled" as const;
  const paid = num(s.paid_amount);
  const total = num(s.total);
  if (paid >= total - 0.01) return "paid" as const;
  return paid > 0 ? ("partial" as const) : ("unpaid" as const);
}

function SalesPage() {
  const { t } = useI18n();
  const [preset, setPreset] = useState<RangePreset>("thisMonth");
  const [range, setRange] = useState<DateRange>(presetRange("thisMonth"));
  const [search, setSearch] = useState("");

  const sales = useQuery({
    queryKey: ["sales", range, search],
    queryFn: () => fetchSales({ range: preset === "all" ? undefined : range, search }),
  });

  const rows = sales.data ?? [];
  const totals = useMemo(
    () =>
      rows
        .filter((s) => s.status === "ACTIVE")
        .reduce(
          (a, s) => ({
            total: a.total + num(s.total),
            paid: a.paid + num(s.paid_amount),
            pending: a.pending + num(s.pending_amount),
            profit: a.profit + num(s.profit),
          }),
          { total: 0, paid: 0, pending: 0, profit: 0 },
        ),
    [rows],
  );

  return (
    <div>
      <PageHeader
        title={t("sales.title")}
        actions={
          <Button asChild size="sm">
            <Link to="/sales/new">{t("sales.new")}</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("dashboard.totalSales")} value={money(totals.total)} />
        <StatCard label={t("dashboard.totalReceived")} value={money(totals.paid)} tone="success" />
        <StatCard label={t("dashboard.totalPending")} value={money(totals.pending)} tone="danger" />
        <StatCard label={t("common.profit")} value={money(totals.profit)} tone="success" />
      </div>

      <Card className="mt-4">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <RangeFilter
              preset={preset}
              range={range}
              onChange={(p, r) => {
                setPreset(p);
                setRange(r);
              }}
            />
            <Input
              className="w-full sm:w-56"
              placeholder={t("invoices.number")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {sales.isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices.number")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("common.customer")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                    <TableHead className="text-right">{t("common.paid")}</TableHead>
                    <TableHead className="text-right">{t("common.pending")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link to="/sales/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">
                          {s.invoice_no}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(s.sale_date)}</TableCell>
                      <TableCell>{s.customers?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">{money(s.total)}</TableCell>
                      <TableCell className="text-right">{money(s.paid_amount)}</TableCell>
                      <TableCell className="text-right">{money(s.pending_amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={statusOf(s)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
