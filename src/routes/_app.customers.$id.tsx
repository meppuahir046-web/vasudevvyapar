import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import {
  deleteCustomerPrice,
  fetchCustomer,
  fetchCustomerPrices,
  fetchCustomerSummary,
  fetchPayments,
  fetchProducts,
  fetchSaleItems,
  fetchSales,
  saveCustomer,
  saveCustomerPrice,
} from "@/lib/data";
import { formatDate, money, num, paymentStatus, qty } from "@/lib/format";

export const Route = createFileRoute("/_app/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer Profile — RetailBook" },
      { name: "description", content: "Customer profile with purchase history, payments, dues and custom pricing." },
      { property: "og:title", content: "Customer Profile — RetailBook" },
      { property: "og:description", content: "Purchase history, payments received, dues and product-wise prices." },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();

  const customer = useQuery({ queryKey: ["customer", id], queryFn: () => fetchCustomer(id) });
  const summary = useQuery({ queryKey: ["customer-summary", id], queryFn: () => fetchCustomerSummary(id) });
  const sales = useQuery({ queryKey: ["customer-sales", id], queryFn: () => fetchSales({ customerId: id }) });
  const payments = useQuery({ queryKey: ["customer-payments", id], queryFn: () => fetchPayments({ customerId: id }) });
  const items = useQuery({ queryKey: ["customer-items", id], queryFn: () => fetchSaleItems({ customerId: id }) });
  const prices = useQuery({ queryKey: ["customer-prices", id], queryFn: () => fetchCustomerPrices(id) });
  const products = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts(false) });

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", whatsapp: "", address: "", city: "", notes: "" });
  const [priceProduct, setPriceProduct] = useState("");
  const [priceValue, setPriceValue] = useState("");

  const productMap = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p])),
    [products.data],
  );

  const save = useMutation({
    mutationFn: () =>
      saveCustomer({
        id,
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        notes: form.notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setEditOpen(false);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  const savePrice = useMutation({
    mutationFn: () => {
      const p = productMap.get(priceProduct);
      return saveCustomerPrice(id, priceProduct, Number(priceValue), p?.unit);
    },
    onSuccess: () => {
      toast.success(t("customers.priceSaved"));
      setPriceProduct("");
      setPriceValue("");
      void qc.invalidateQueries({ queryKey: ["customer-prices", id] });
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  const removePrice = useMutation({
    mutationFn: (productId: string) => deleteCustomerPrice(id, productId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["customer-prices", id] }),
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  if (customer.isLoading) return <Loading />;
  const c = customer.data;
  if (!c) return <EmptyState />;
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={[c.mobile, c.city].filter(Boolean).join(" · ") || t("customers.profile")}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/customers">{t("common.back")}</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForm({
                  name: c.name,
                  mobile: c.mobile ?? "",
                  whatsapp: c.whatsapp ?? "",
                  address: c.address ?? "",
                  city: c.city ?? "",
                  notes: c.notes ?? "",
                });
                setEditOpen(true);
              }}
            >
              {t("customers.edit")}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("customers.orders")} value={String(num(s?.orders))} />
        <StatCard label={t("customers.totalPurchased")} value={money(s?.total_purchased)} />
        <StatCard label={t("customers.totalPaid")} value={money(s?.total_paid)} tone="success" />
        <StatCard
          label={t("customers.totalPending")}
          value={money(s?.total_pending)}
          tone={num(s?.total_pending) > 0 ? "danger" : "default"}
        />
      </div>

      <Tabs defaultValue="sales" className="mt-6">
        <TabsList>
          <TabsTrigger value="sales">{t("customers.purchaseHistory")}</TabsTrigger>
          <TabsTrigger value="payments">{t("customers.paymentHistory")}</TabsTrigger>
          <TabsTrigger value="products">{t("customers.productsPurchased")}</TabsTrigger>
          <TabsTrigger value="prices">{t("customers.prices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardContent className="p-0">
              {sales.isLoading ? (
                <Loading />
              ) : (sales.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.invoice")}</TableHead>
                      <TableHead className="text-right">{t("common.total")}</TableHead>
                      <TableHead className="text-right">{t("common.paid")}</TableHead>
                      <TableHead className="text-right">{t("common.pending")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sales.data ?? []).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{formatDate(sale.sale_date)}</TableCell>
                        <TableCell>
                          <Link to="/sales/$id" params={{ id: sale.id }} className="font-medium text-primary">
                            {sale.invoice_no}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{money(sale.total)}</TableCell>
                        <TableCell className="text-right">{money(sale.paid_amount)}</TableCell>
                        <TableCell className="text-right">{money(sale.pending_amount)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              sale.status === "CANCELLED"
                                ? "cancelled"
                                : paymentStatus(num(sale.total), num(sale.paid_amount))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {(payments.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.invoice")}</TableHead>
                      <TableHead>{t("payments.method")}</TableHead>
                      <TableHead className="text-right">{t("payments.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payments.data ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.paid_at)}</TableCell>
                        <TableCell>{p.sales?.invoice_no ?? "-"}</TableCell>
                        <TableCell>{t(`payments.method.${p.method}`)}</TableCell>
                        <TableCell className="text-right">{money(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              {(items.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.product")}</TableHead>
                      <TableHead className="text-right">{t("common.quantity")}</TableHead>
                      <TableHead className="text-right">{t("common.rate")}</TableHead>
                      <TableHead className="text-right">{t("common.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(items.data ?? []).map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{formatDate(i.sales?.sale_date)}</TableCell>
                        <TableCell>{i.products?.name ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {qty(i.quantity)} {i.unit}
                        </TableCell>
                        <TableCell className="text-right">{money(i.rate)}</TableCell>
                        <TableCell className="text-right">{money(i.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("customers.customerPrice")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-56">
                  <Label className="text-xs text-muted-foreground">{t("common.product")}</Label>
                  <Select value={priceProduct} onValueChange={setPriceProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("sales.selectProduct")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(products.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Label className="text-xs text-muted-foreground">{t("common.rate")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!priceProduct || !priceValue || savePrice.isPending}
                  onClick={() => savePrice.mutate()}
                >
                  {t("common.save")}
                </Button>
              </div>

              {(prices.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.product")}</TableHead>
                      <TableHead className="text-right">{t("customers.defaultPrice")}</TableHead>
                      <TableHead className="text-right">{t("customers.customerPrice")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(prices.data ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{productMap.get(p.product_id)?.name ?? "-"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {money(productMap.get(p.product_id)?.default_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{money(p.selling_price)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrice.mutate(p.product_id)}
                          >
                            {t("common.delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.edit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t("common.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.mobile")}</Label>
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.whatsapp")}</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.city")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.address")}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
