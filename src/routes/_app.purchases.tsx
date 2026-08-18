import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading, PageHeader, RangeFilter, StatCard } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { addPurchase, addSupplier, fetchProducts, fetchPurchases, fetchSuppliers, type Unit } from "@/lib/data";
import { formatDate, money, num, presetRange, qty, toISODate, type DateRange, type RangePreset } from "@/lib/format";

export const Route = createFileRoute("/_app/purchases")({
  head: () => ({
    meta: [
      { title: "Stock In & Purchases — RetailBook" },
      { name: "description", content: "Record stock purchases with supplier, quantity and total amount; cost per unit is calculated automatically." },
      { property: "og:title", content: "Stock In & Purchases — RetailBook" },
      { property: "og:description", content: "Record purchases and keep weighted average cost accurate." },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [preset, setPreset] = useState<RangePreset>("thisMonth");
  const [range, setRange] = useState<DateRange>(presetRange("thisMonth"));
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("KG");
  const [total, setTotal] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts(false) });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases", range],
    queryFn: () => fetchPurchases(range),
  });

  const costPerUnit = num(quantity) > 0 ? num(total) / num(quantity) : 0;

  const totals = useMemo(() => {
    const list = purchases ?? [];
    return {
      amount: list.reduce((a, p) => a + num(p.total_amount), 0),
      units: list.reduce((a, p) => a + num(p.quantity), 0),
      count: list.length,
    };
  }, [purchases]);

  const save = useMutation({
    mutationFn: async () => {
      let sid: string | null = supplierId || null;
      if (!sid && newSupplier.trim()) {
        const created = await addSupplier(newSupplier.trim());
        sid = (created as { id: string }).id;
      }
      return addPurchase({
        product_id: productId,
        supplier_id: sid,
        purchase_date: date,
        quantity: num(quantity),
        unit,
        total_amount: num(total),
        invoice_no: invoiceNo.trim() || null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(t("purchases.saved"));
      setOpen(false);
      setQuantity("");
      setTotal("");
      setInvoiceNo("");
      setNotes("");
      setNewSupplier("");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  const canSave = productId && num(quantity) > 0 && num(total) > 0;

  return (
    <div>
      <PageHeader
        title={t("purchases.title")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">{t("purchases.add")}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("purchases.add")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>{t("common.product")}</Label>
                  <Select
                    value={productId}
                    onValueChange={(v) => {
                      setProductId(v);
                      const p = (products ?? []).find((x) => x.id === v);
                      if (p) setUnit(p.unit);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("sales.selectProduct")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(products ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("purchases.date")}</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("common.unit")}</Label>
                    <Input value={unit} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("common.quantity")}</Label>
                    <Input type="number" min="0" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("purchases.totalAmount")}</Label>
                    <Input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("purchases.costPerUnit")}: <span className="font-semibold text-foreground">{money(costPerUnit)}</span>
                </p>
                <div>
                  <Label>{t("common.supplier")}</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(suppliers ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder={`${t("common.add")} ${t("common.supplier")}`}
                  />
                </div>
                <div>
                  <Label>{t("purchases.invoiceNo")}</Label>
                  <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                </div>
                <div>
                  <Label>{t("common.notes")}</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("purchases.totalAmount")} value={money(totals.amount)} />
        <StatCard label={t("common.quantity")} value={qty(totals.units)} />
        <StatCard label={t("reports.stockIn")} value={String(totals.count)} />
      </div>

      <div className="mt-4">
        <RangeFilter
          preset={preset}
          range={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("common.history")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <Loading />
          ) : (purchases ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.product")}</TableHead>
                  <TableHead>{t("common.supplier")}</TableHead>
                  <TableHead className="text-right">{t("common.quantity")}</TableHead>
                  <TableHead className="text-right">{t("purchases.costPerUnit")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                  <TableHead>{t("common.invoice")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(purchases ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(p.purchase_date)}</TableCell>
                    <TableCell className="font-medium">{p.products?.name ?? "-"}</TableCell>
                    <TableCell>{p.suppliers?.name ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {qty(p.quantity)} {p.unit}
                    </TableCell>
                    <TableCell className="text-right">{money(p.cost_per_unit)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(p.total_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.invoice_no ?? "-"}</TableCell>
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
