import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading, PageHeader, StatCard } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { fetchCustomerSummaries, saveCustomer } from "@/lib/data";
import { formatDate, money, num } from "@/lib/format";

export const Route = createFileRoute("/_app/customers/")({
  head: () => ({
    meta: [
      { title: "Customers & Dues — RetailBook" },
      { name: "description", content: "Manage customers, their purchase totals, payments received and pending dues." },
      { property: "og:title", content: "Customers & Dues — RetailBook" },
      { property: "og:description", content: "Customer directory with lifetime value and outstanding balances." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", whatsapp: "", address: "", city: "", notes: "" });

  const { data, isLoading } = useQuery({ queryKey: ["customer-summaries"], queryFn: fetchCustomerSummaries });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((c) => !s || c.name.toLowerCase().includes(s) || (c.mobile ?? "").includes(s));
  }, [data, search]);

  const totals = useMemo(() => {
    const list = data ?? [];
    return {
      count: list.length,
      purchased: list.reduce((a, c) => a + num(c.total_purchased), 0),
      pending: list.reduce((a, c) => a + num(c.total_pending), 0),
    };
  }, [data]);

  const create = useMutation({
    mutationFn: () =>
      saveCustomer({
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        whatsapp: form.whatsapp.trim() || form.mobile.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        notes: form.notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setOpen(false);
      setForm({ name: "", mobile: "", whatsapp: "", address: "", city: "", notes: "" });
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  return (
    <div>
      <PageHeader
        title={t("customers.title")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">{t("customers.add")}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("customers.add")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>{t("common.name")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("common.mobile")}</Label>
                    <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("common.whatsapp")}</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("common.address")}</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>{t("common.city")}</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>{t("common.notes")}</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("dashboard.totalCustomers")} value={String(totals.count)} />
        <StatCard label={t("customers.totalPurchased")} value={money(totals.purchased)} />
        <StatCard label={t("customers.totalPending")} value={money(totals.pending)} tone="warning" />
      </div>

      <Input
        className="mt-4 max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("customers.search")}
      />

      <Card className="mt-4">
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.mobile")}</TableHead>
                  <TableHead className="text-right">{t("customers.orders")}</TableHead>
                  <TableHead className="text-right">{t("customers.totalPurchased")}</TableHead>
                  <TableHead className="text-right">{t("customers.totalPaid")}</TableHead>
                  <TableHead className="text-right">{t("customers.totalPending")}</TableHead>
                  <TableHead>{t("inventory.lastSale")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to="/customers/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.city ?? ""}</div>
                    </TableCell>
                    <TableCell>{c.mobile ?? "-"}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{money(c.total_purchased)}</TableCell>
                    <TableCell className="text-right">{money(c.total_paid)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${num(c.total_pending) > 0 ? "text-destructive" : ""}`}
                    >
                      {money(c.total_pending)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {c.last_sale ? formatDate(c.last_sale) : "-"}
                    </TableCell>
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
