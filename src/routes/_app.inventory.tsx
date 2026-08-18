import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Loading, PageHeader, StatCard } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { fetchInventory, fetchLedger } from "@/lib/data";
import { formatDate, money, num, qty } from "@/lib/format";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & Stock Ledger — RetailBook" },
      { name: "description", content: "Track stock levels, weighted average cost, stock value and the full inventory ledger." },
      { property: "og:title", content: "Inventory & Stock Ledger — RetailBook" },
      { property: "og:description", content: "Track stock levels, weighted average cost and stock movements." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<string>("all");

  const { data: inventory, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
  const { data: ledger } = useQuery({
    queryKey: ["ledger", productId],
    queryFn: () => fetchLedger(productId === "all" ? undefined : productId),
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (inventory ?? []).filter((r) => !s || r.name.toLowerCase().includes(s) || (r.sku ?? "").toLowerCase().includes(s));
  }, [inventory, search]);

  const totals = useMemo(() => {
    const list = inventory ?? [];
    return {
      investment: list.reduce((a, r) => a + num(r.total_investment), 0),
      value: list.reduce((a, r) => a + num(r.stock_value), 0),
      units: list.reduce((a, r) => a + num(r.current_stock), 0),
      low: list.filter((r) => r.is_low_stock).length,
    };
  }, [inventory]);

  return (
    <div>
      <PageHeader title={t("inventory.title")} subtitle={t("app.tagline")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("dashboard.stockInvestment")} value={money(totals.investment)} />
        <StatCard label={t("inventory.stockValue")} value={money(totals.value)} tone="success" />
        <StatCard label={t("dashboard.currentStock")} value={qty(totals.units)} />
        <StatCard label={t("products.lowStock")} value={String(totals.low)} tone={totals.low ? "warning" : "default"} />
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("inventory.title")}</CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("products.search")}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.product")}</TableHead>
                  <TableHead className="text-right">{t("inventory.totalPurchased")}</TableHead>
                  <TableHead className="text-right">{t("inventory.totalSold")}</TableHead>
                  <TableHead className="text-right">{t("inventory.available")}</TableHead>
                  <TableHead className="text-right">{t("products.avgCost")}</TableHead>
                  <TableHead className="text-right">{t("inventory.stockValue")}</TableHead>
                  <TableHead className="text-right">{t("common.profit")}</TableHead>
                  <TableHead>{t("inventory.lastSale")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={r.is_low_stock ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.category_name ?? t("common.none")} · {r.unit}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{qty(r.total_purchased)}</TableCell>
                    <TableCell className="text-right">{qty(r.total_sold)}</TableCell>
                    <TableCell className="text-right font-semibold">{qty(r.current_stock)}</TableCell>
                    <TableCell className="text-right">{money(r.avg_cost)}</TableCell>
                    <TableCell className="text-right">{money(r.stock_value)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {money(r.total_profit)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.last_sale ? formatDate(r.last_sale) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("inventory.ledger")}</CardTitle>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {(inventory ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {!ledger ? (
            <Loading />
          ) : ledger.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.product")}</TableHead>
                  <TableHead>{t("inventory.txnType")}</TableHead>
                  <TableHead className="text-right">{t("common.quantity")}</TableHead>
                  <TableHead className="text-right">{t("common.cost")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.slice(0, 200).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(l.txn_date)}</TableCell>
                    <TableCell>{l.products?.name ?? "-"}</TableCell>
                    <TableCell className="text-xs font-medium">{l.txn_type}</TableCell>
                    <TableCell className={`text-right ${num(l.quantity) < 0 ? "text-destructive" : ""}`}>
                      {qty(l.quantity)}
                    </TableCell>
                    <TableCell className="text-right">{l.unit_cost == null ? "-" : money(l.unit_cost)}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">{l.notes ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
