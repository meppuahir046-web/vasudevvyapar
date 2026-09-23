import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Eye, ExternalLink, Printer, Share2 } from "lucide-react";
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
import {
  EmptyState,
  Loading,
  PageHeader,
  pageActionButtonClass,
  StatusBadge,
  SummaryRow,
  TableScroll,
} from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  PAYMENT_METHODS,
  addPayment,
  cancelSale,
  createSaleReturn,
  fetchSaleReturn,
  fetchPayments,
  fetchSale,
  fetchSettings,
  friendlyError,
  type PaymentMethod,
} from "@/lib/data";
import { formatDate, money, num, qty, toISODate } from "@/lib/format";
import {
  downloadInvoicePdf,
  invoiceBlobUrl,
  invoiceWhatsappMessage,
  printInvoicePdf,
  saleToInvoice,
  shareInvoice,
  downloadSaleReturnPdf,
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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

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
    onSuccess: async (returnId) => {
      try {
        const returnData = await fetchSaleReturn(returnId);
        await downloadSaleReturnPdf(returnData, settings.data ?? null, {
          title: t("returns.bill"),
          billTo: t("invoices.billTo"),
          returnBillNo: t("returns.billNumber"),
          originalInvoice: t("returns.originalInvoice"),
          originalDate: t("returns.originalDate"),
          returnDate: t("returns.returnDate"),
          status: t("returns.status"),
          returned: t("returns.returned"),
          no: "No.",
          product: t("common.product"),
          sku: "SKU",
          unit: t("common.unit"),
          originalQty: t("returns.originalQty"),
          returnedQty: t("returns.returnedQty"),
          remainingQty: t("returns.remainingQty"),
          rate: t("common.rate"),
          amount: t("common.amount"),
          originalTotal: t("returns.originalTotal"),
          returnAmount: t("returns.returnAmount"),
          remainingValue: t("returns.remainingValue"),
          paid: t("common.paid"),
          pending: t("common.pending"),
          paymentAdjustment: t("returns.paymentAdjustment"),
          noRefund: t("returns.noRefund"),
        });
        toast.success(t("returns.saved"));
        setReturnOpen(false);
        setReturnQty({});
        setReturnNotes("");
        invalidate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.error"));
      }
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

  const onPreview = async () => {
    setPreviewOpen(true);
    setPreviewBusy(true);
    try {
      const url = await invoiceBlobUrl(invoice());
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
      setPreviewOpen(false);
    } finally {
      setPreviewBusy(false);
    }
  };

  const onShare = async (target: "sheet" | "whatsapp" = "whatsapp") => {
    try {
      const data = invoice();
      await shareInvoice(
        data,
        invoiceWhatsappMessage(data, money),
        s.customers?.whatsapp ?? s.customers?.mobile ?? null,
        target,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };



  return (
    <div className="w-full min-w-0 max-w-full">
      <PageHeader
        title={`${t("common.invoice")} ${s.invoice_no}`}
        subtitle={`${formatDate(s.sale_date)} · ${s.customers?.name ?? "-"}`}
        actions={
          <>
            <Button variant="outline" size="sm" className={pageActionButtonClass} onClick={onPreview}>
              <Eye className="mr-1 size-4 shrink-0" /> {t("invoices.preview")}
            </Button>
            <Button variant="outline" size="sm" className={pageActionButtonClass} onClick={onDownload}>
              <Download className="mr-1 size-4 shrink-0" /> {t("invoices.download")}
            </Button>
            <Button variant="outline" size="sm" className={pageActionButtonClass} onClick={onPrint}>
              <Printer className="mr-1 size-4 shrink-0" /> {t("invoices.print")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={pageActionButtonClass}
              onClick={() => void onShare("sheet")}
            >
              <Share2 className="mr-1 size-4 shrink-0" /> {t("invoices.share")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(pageActionButtonClass, "col-span-2 sm:col-span-1")}
              onClick={() => void onShare("whatsapp")}
            >
              <Share2 className="mr-1 size-4 shrink-0" /> {t("invoices.shareWhatsapp")}
            </Button>

            {s.status === "ACTIVE" && (
              <>
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className={cn(pageActionButtonClass, "col-span-2 sm:col-span-1")}>
                      {t("sales.recordPayment")}
                    </Button>
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
                    <Button variant="outline" size="sm" className={pageActionButtonClass}>
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
                  className={pageActionButtonClass}
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

      <Dialog
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o && previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="flex h-[92vh] max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-3 p-3 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base">
              {t("invoices.preview")} · {s.invoice_no}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{t("invoices.previewHint")}</p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted">
            {previewBusy || !previewUrl ? (
              <Loading />
            ) : (
              <object data={previewUrl} type="application/pdf" className="h-full w-full">
                <iframe src={previewUrl} title={s.invoice_no} className="h-full w-full" />
              </object>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!previewUrl}
              onClick={() => previewUrl && window.open(previewUrl, "_blank", "noopener")}
            >
              <ExternalLink className="mr-1 size-4" /> {t("invoices.openPdf")}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
              <Download className="mr-1 size-4" /> {t("invoices.download")}
            </Button>
            <Button size="sm" className="flex-1" onClick={() => void onShare("whatsapp")}>
              <Share2 className="mr-1 size-4" /> {t("invoices.shareWhatsapp")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("sales.items")}</CardTitle>
            <StatusBadge status={status} />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="space-y-3 md:hidden">
              {(s.sale_items ?? []).map((i) => (
                <div key={i.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium break-words [overflow-wrap:anywhere]">
                    {i.products?.name ?? "-"}
                    {num(i.returned_quantity) > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (-{qty(i.returned_quantity)} {t("returns.title")})
                      </span>
                    )}
                  </p>
                  <dl className="mt-2 space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.quantity")}</dt>
                      <dd className="shrink-0 text-right tabular-nums">
                        {qty(i.quantity)} {t(`unit.${i.unit}`)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.rate")}</dt>
                      <dd className="shrink-0 text-right tabular-nums">{money(i.rate)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.amount")}</dt>
                      <dd className="shrink-0 text-right font-medium tabular-nums">{money(i.amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("common.profit")}</dt>
                      <dd className="shrink-0 text-right tabular-nums">{money(i.profit)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <TableScroll className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[8rem]">{t("common.product")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("common.quantity")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("common.rate")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("common.amount")}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">{t("common.profit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s.sale_items ?? []).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="max-w-[14rem] break-words [overflow-wrap:anywhere] sm:max-w-none">
                        {i.products?.name ?? "-"}
                        {num(i.returned_quantity) > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (-{qty(i.returned_quantity)} {t("returns.title")})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {qty(i.quantity)} {t(`unit.${i.unit}`)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(i.rate)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(i.amount)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(i.profit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
            {s.notes && (
              <p className="mt-3 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{s.notes}</p>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">{t("common.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label={t("sales.subtotal")} value={money(s.subtotal)} />
              <SummaryRow label={t("sales.discount")} value={`- ${money(s.discount)}`} />
              <SummaryRow label={t("sales.grandTotal")} value={money(s.total)} strong />
              <SummaryRow label={t("common.paid")} value={money(s.paid_amount)} />
              <SummaryRow label={t("common.pending")} value={money(s.pending_amount)} />
              <SummaryRow label={t("common.profit")} value={money(s.profit)} />
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
                    <li key={p.id} className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">
                        {formatDate(p.paid_at)} · {t(`payments.method.${p.method}`)}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{money(p.amount)}</span>
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
