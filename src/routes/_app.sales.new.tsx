import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import {
  PAYMENT_METHODS,
  createSale,
  fetchCustomerPrices,
  fetchCustomers,
  fetchInventory,
  friendlyError,
  type PaymentMethod,
} from "@/lib/data";
import { money, num, qty, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_app/sales/new")({
  head: () => ({
    meta: [
      { title: "New Sale — RetailBook" },
      { name: "description", content: "Create a sale with live stock validation, customer pricing and part payments." },
      { property: "og:title", content: "New Sale — RetailBook" },
      { property: "og:description", content: "Billing screen with stock checks, discounts and partial payments." },
    ],
  }),
  component: NewSalePage,
});

type Line = { key: number; product_id: string; quantity: string; rate: string };

let seq = 1;
const emptyLine = (): Line => ({ key: seq++, product_id: "", quantity: "1", rate: "" });

function NewSalePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const customers = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });

  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(toISODate(new Date()));
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [savePrices, setSavePrices] = useState(true);

  const prices = useQuery({
    queryKey: ["customer-prices", customerId],
    queryFn: () => fetchCustomerPrices(customerId),
    enabled: !!customerId,
  });

  const priceMap = useMemo(
    () => new Map((prices.data ?? []).map((p) => [p.product_id, num(p.selling_price)])),
    [prices.data],
  );
  const productMap = useMemo(
    () => new Map((inventory.data ?? []).map((p) => [p.id, p])),
    [inventory.data],
  );

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (key: number, productId: string) => {
    const p = productMap.get(productId);
    const rate = priceMap.get(productId) ?? num(p?.default_price);
    setLine(key, { product_id: productId, rate: rate ? String(rate) : "" });
  };

  const rows = lines.map((l) => {
    const p = productMap.get(l.product_id);
    const quantity = num(l.quantity);
    const rate = num(l.rate);
    const stock = num(p?.current_stock);
    return { line: l, product: p, quantity, rate, amount: quantity * rate, stock, over: !!p && quantity > stock };
  });

  const subtotal = rows.reduce((a, r) => a + r.amount, 0);
  const total = Math.max(0, subtotal - num(discount));
  const pending = Math.max(0, total - num(paid));
  const hasOver = rows.some((r) => r.over);
  const validItems = rows.filter((r) => r.product && r.quantity > 0 && r.rate >= 0);

  const submit = useMutation({
    mutationFn: () =>
      createSale({
        customer_id: customerId,
        items: validItems.map((r) => ({
          product_id: r.line.product_id,
          quantity: r.quantity,
          rate: r.rate,
        })),
        sale_date: saleDate,
        discount: num(discount),
        paid: num(paid),
        method,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        save_prices: savePrices,
      }),
    onSuccess: (id) => {
      toast.success(t("sales.saved"));
      navigate({ to: "/sales/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(friendlyError(e.message, t)),
  });

  return (
    <div>
      <PageHeader title={t("sales.new")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("sales.items")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("sales.selectCustomer")}</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sales.selectCustomer")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.mobile ? ` · ${c.mobile}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("common.date")}</Label>
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.line.key} className="rounded-md border p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_100px_110px_110px_40px] sm:items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("common.product")}</Label>
                      <Select value={r.line.product_id} onValueChange={(v) => pickProduct(r.line.key, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("sales.selectProduct")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(inventory.data ?? [])
                            .filter((p) => p.active)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {qty(p.current_stock)} {p.unit}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("common.quantity")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={r.line.quantity}
                        onChange={(e) => setLine(r.line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("common.rate")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.line.rate}
                        onChange={(e) => setLine(r.line.key, { rate: e.target.value })}
                      />
                    </div>
                    <div className="text-right text-sm font-semibold sm:pb-2">{money(r.amount)}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.delete")}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== r.line.key))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {r.product && (
                    <p className={r.over ? "mt-1 text-xs font-medium text-destructive" : "mt-1 text-xs text-muted-foreground"}>
                      {t("sales.availableStock")}: {qty(r.stock)} {r.product.unit}
                      {r.over ? ` — ${t("sales.insufficientStock")}` : ""}
                      {priceMap.has(r.line.product_id) ? ` · ${t("customers.customerPrice")}` : ""}
                    </p>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
                {t("sales.addProduct")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("common.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("sales.subtotal")}</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <Label>{t("sales.discount")}</Label>
              <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{t("sales.grandTotal")}</span>
              <span>{money(total)}</span>
            </div>
            <div>
              <Label>{t("sales.paidAmount")}</Label>
              <Input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
              <div className="mt-1 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPaid(String(total))}>
                  {t("common.paid")} 100%
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPaid("0")}>
                  {t("common.clear")}
                </Button>
              </div>
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
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">{t("sales.pendingAmount")}</span>
              <span className={pending > 0 ? "text-destructive" : ""}>{money(pending)}</span>
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={savePrices} onCheckedChange={(v) => setSavePrices(v === true)} />
              {t("sales.savePrices")}
            </label>
            <Button
              className="w-full"
              disabled={!customerId || validItems.length === 0 || hasOver || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {t("sales.saveSale")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
