import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading, PageHeader, RangeFilter, StatCard } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import {
  PAYMENT_METHODS,
  addPayment,
  fetchCustomerSummaries,
  fetchPayments,
  fetchSales,
  friendlyError,
  type PaymentMethod,
} from "@/lib/data";
import { formatDate, money, num, presetRange, toISODate, type DateRange, type RangePreset } from "@/lib/format";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Dues — RetailBook" },
      { name: "description", content: "Record customer payments, track outstanding dues and review payment history." },
      { property: "og:title", content: "Payments & Dues — RetailBook" },
      { property: "og:description", content: "Cash, UPI, bank and card payments with outstanding balance tracking." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [preset, setPreset] = useState<RangePreset>("thisMonth");
  const [range, setRange] = useState<DateRange>(presetRange("thisMonth"));
  const [open, setOpen] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [saleId, setSaleId] = useState("none");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(toISODate(new Date()));

  const payments = useQuery({
    queryKey: ["payments", { range, preset }],
    queryFn: () => (preset === "all" ? fetchPayments() : fetchPayments({ range })),
  });
  const customers = useQuery({ queryKey: ["customer-summaries"], queryFn: fetchCustomerSummaries });
  const openSales = useQuery({
    queryKey: ["sales", "open", customerId],
    queryFn: () => fetchSales({ customerId, status: "ACTIVE" }),
    enabled: !!customerId,
  });

  const totals = useMemo(() => {
    const rows = payments.data ?? [];
    const received = rows.reduce((a, p) => a + num(p.amount), 0);
    const dues = (customers.data ?? []).reduce((a, c) => a + num(c.total_pending), 0);
    return { received, dues };
  }, [payments.data, customers.data]);

  const outstanding = num((customers.data ?? []).find((c) => c.id === customerId)?.total_pending);

  const save = useMutation({
    mutationFn: () =>
      addPayment({
        customer_id: customerId,
        sale_id: saleId === "none" ? null : saleId,
        amount: num(amount),
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        paid_at: paidAt,
      }),
    onSuccess: () => {
      toast.success(t("payments.saved"));
      setOpen(false);
      setAmount("");
      setReference("");
      setNotes("");
      setSaleId("none");
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["customer-summaries"] });
      void qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, t)),
  });

  return (
    <div>
      <PageHeader
        title={t("payments.title")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">{t("payments.add")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("payments.add")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("common.customer")}</Label>
                  <Select
                    value={customerId}
                    onValueChange={(v) => {
                      setCustomerId(v);
                      setSaleId("none");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("sales.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {money(c.total_pending)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!!customerId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("payments.outstanding")}: {money(outstanding)}
                    </p>
                  )}
                </div>
                <div>
                  <Label>{t("common.invoice")}</Label>
                  <Select value={saleId} onValueChange={setSaleId} disabled={!customerId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("common.none")}</SelectItem>
                      {(openSales.data ?? [])
                        .filter((s) => num(s.pending_amount) > 0)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.invoice_no} — {money(s.pending_amount)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("payments.amount")}</Label>
                    <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("common.date")}</Label>
                    <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("payments.method")}</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t(`payments.method.${m}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("payments.reference")}</Label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t("common.notes")}</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !customerId || num(amount) <= 0}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t("dashboard.totalReceived")} value={money(totals.received)} tone="success" />
        <StatCard label={t("dashboard.totalPending")} value={money(totals.dues)} tone="danger" />
      </div>

      <Card className="mt-4">
        <CardContent className="space-y-4 p-4">
          <RangeFilter
            preset={preset}
            range={range}
            onChange={(p, r) => {
              setPreset(p);
              setRange(r);
            }}
          />
          {payments.isLoading ? (
            <Loading />
          ) : (payments.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("common.customer")}</TableHead>
                    <TableHead>{t("common.invoice")}</TableHead>
                    <TableHead>{t("payments.method")}</TableHead>
                    <TableHead>{t("payments.reference")}</TableHead>
                    <TableHead className="text-right">{t("payments.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.paid_at)}</TableCell>
                      <TableCell>
                        <Link
                          to="/customers/$id"
                          params={{ id: p.customer_id }}
                          className="text-primary hover:underline"
                        >
                          {p.customers?.name ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {p.sale_id ? (
                          <Link to="/sales/$id" params={{ id: p.sale_id }} className="text-primary hover:underline">
                            {p.sales?.invoice_no ?? "-"}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{t(`payments.method.${p.method}`)}</TableCell>
                      <TableCell>{p.reference ?? "-"}</TableCell>
                      <TableCell className="text-right font-medium">{money(p.amount)}</TableCell>
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
