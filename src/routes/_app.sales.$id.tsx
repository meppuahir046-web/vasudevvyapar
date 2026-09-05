import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState, Loading, PageHeader, StatusBadge } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import {
  PAYMENT_METHODS,
  addPayment,
  cancelSale,
  createSaleReturn,
  fetchPayments,
  fetchSale,
  fetchSettings,
  friendlyError,
  type PaymentMethod,
} from "@/lib/data";
import { formatDate, money, num, qty, toISODate } from "@/lib/format";
import {
  downloadInvoicePdf,
  invoiceWhatsappMessage,
  printInvoicePdf,
  saleToInvoice,
  shareInvoice,
} from "@/lib/pdf";

import { invoiceLabels } from "@/lib/invoice-labels";

export const Route = createFileRoute("/_app/sales/$id")({
  head: () => ({
    meta: [
      { title: "Invoice details — RetailBook" },
      { name: "description", content: "Invoice items, payments, PDF download, WhatsApp share and returns." },
      { property: "og:title", content: "Invoice details — RetailBook" },
      { property: "og:description", content: "View an invoice with items, payments and return handling." },
    ],
  }),
  component: SaleDetailPage,
});

function SaleDetailPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const sale = useQuery({ queryKey: ["sale", id], queryFn: () => fetchSale(id) });
  const payments = useQuery({ queryKey: ["payments", { saleId: id }], queryFn: () => fetchPayments({ saleId: id }) });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [returnNotes, setReturnNotes] = useState("");

  const s = sale.data;
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["sale", id] });
    void qc.invalidateQueries({ queryKey: ["payments"] });
    void qc.invalidateQueries({ queryKey: ["sales"] });
    void qc.invalidateQueries({ queryKey: ["inventory"] });
    void qc.invalidateQueries({ queryKey: ["customer-summaries"] });
  };

  const pay = useMutation({
    mutationFn: () =>
      addPayment({
        customer_id: s!.customer_id,
        sale_id: id,
        amount: num(amount),
        method,
        reference: reference.trim() || null,
        paid_at: toISODate(new Date()),
      }),
    onSuccess: () => {
      toast.success(t("payments.saved"));
      setPayOpen(false);
      setAmount("");
      setReference("");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, t)),
  });

  const doReturn = useMutation({
    mutationFn: () =>
      createSaleReturn(
        id,
        Object.entries(returnQty)
          .filter(([, v]) => num(v) > 0)
          .map(([sale_item_id, v]) => ({ sale_item_id, quantity: num(v) })),
        returnNotes.trim() || undefined,
      ),
    onSuccess: () => {
      toast.success(t("returns.saved"));
      setReturnOpen(false);
      setReturnQty({});
      setReturnNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, t)),
  });

  const cancel = useMutation({
    mutationFn: () => cancelSale(id),
    onSuccess: () => {
      toast.success(t("sales.cancelled"));
      invalidate();
      navigate({ to: "/sales" });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, t)),
  });

  if (sale.isLoading) return <Loading />;
  if (!s) return <EmptyState />;

  const status =
    s.status === "CANCELLED"
      ? ("cancelled" as const)
      : num(s.paid_amount) >= num(s.total) - 0.01
        ? ("paid" as const)
        : num(s.paid_amount) > 0
          ? ("partial" as const)
          : ("unpaid" as const);

  const invoice = () =>
    saleToInvoice(s, settings.data ?? null, invoiceLabels(t), {
      payments: payments.data ?? [],
      customerOutstanding: null,
      methodLabel: (m) => t(`payments.method.${m}`),
      unitLabel: (u) => t(`unit.${u}`),
    });

  const onDownload = async () => {
    try {
      await downloadInvoicePdf(invoice());
      toast.success(t("invoices.pdfReady"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const onPrint = async () => {
    try {
      await printInvoicePdf(invoice());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const onShare = async () => {
    try {
      const data = invoice();
      await shareInvoice(data, invoiceWhatsappMessage(data, money), s.customers?.whatsapp ?? s.customers?.mobile ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };


  return (
    <div>
      <PageHeader
        title={`${t("common.invoice")} ${s.invoice_no}`}
        subtitle={`${formatDate(s.sale_date)} · ${s.customers?.name ?? "-"}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="mr-1 size-4" /> {t("invoices.download")}
            </Button>
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="mr-1 size-4" /> {t("invoices.shareWhatsapp")}
            </Button>
            {s.status === "ACTIVE" && (
              <>
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">{t("sales.recordPayment")}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("sales.recordPayment")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t("payments.outstanding")}: <strong>{money(s.pending_amount)}</strong>
                      </p>
                      <div>
                        <Label>{t("payments.amount")}</Label>
                        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </div>
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
                    <DialogFooter>
                      <Button onClick={() => pay.mutate()} disabled={pay.isPending || num(amount) <= 0}>
                        {t("common.save")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("sales.return")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("returns.title")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {(s.sale_items ?? []).map((i) => {
                        const remaining = num(i.quantity) - num(i.returned_quantity);
                        return (
                          <div key={i.id} className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{i.products?.name ?? "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {qty(remaining)} {t(`unit.${i.unit}`)} · {money(i.rate)}
                              </p>
                            </div>
                            <Input
                              className="w-24"
                              type="number"
                              min="0"
                              max={remaining}
                              step="0.001"
                              value={returnQty[i.id] ?? ""}
                              onChange={(e) => setReturnQty((p) => ({ ...p, [i.id]: e.target.value }))}
                            />
                          </div>
                        );
                      })}
                      <div>
                        <Label>{t("common.notes")}</Label>
                        <Textarea rows={2} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => doReturn.mutate()}
                        disabled={doReturn.isPending || !Object.values(returnQty).some((v) => num(v) > 0)}
                      >
                        {t("common.save")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(t("sales.cancelConfirm"))) cancel.mutate();
                  }}
                >
                  {t("sales.cancel")}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("sales.items")}</CardTitle>
            <StatusBadge status={status} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.product")}</TableHead>
                    <TableHead className="text-right">{t("common.quantity")}</TableHead>
                    <TableHead className="text-right">{t("common.rate")}</TableHead>
                    <TableHead className="text-right">{t("common.amount")}</TableHead>
                    <TableHead className="text-right">{t("common.profit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s.sale_items ?? []).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.products?.name ?? "-"}
                        {num(i.returned_quantity) > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (-{qty(i.returned_quantity)} {t("returns.title")})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {qty(i.quantity)} {t(`unit.${i.unit}`)}
                      </TableCell>
                      <TableCell className="text-right">{money(i.rate)}</TableCell>
                      <TableCell className="text-right">{money(i.amount)}</TableCell>
                      <TableCell className="text-right">{money(i.profit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {s.notes && <p className="mt-3 text-sm text-muted-foreground">{s.notes}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("common.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={t("sales.subtotal")} value={money(s.subtotal)} />
              <Row label={t("sales.discount")} value={`- ${money(s.discount)}`} />
              <Row label={t("sales.grandTotal")} value={money(s.total)} strong />
              <Row label={t("common.paid")} value={money(s.paid_amount)} />
              <Row label={t("common.pending")} value={money(s.pending_amount)} />
              <Row label={t("common.profit")} value={money(s.profit)} />
              <div className="pt-2">
                <Link
                  to="/customers/$id"
                  params={{ id: s.customer_id }}
                  className="text-sm text-primary hover:underline"
                >
                  {t("customers.profile")}
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("customers.paymentHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(payments.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(payments.data ?? []).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {formatDate(p.paid_at)} · {t(`payments.method.${p.method}`)}
                      </span>
                      <span className="font-medium">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
