import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Loading, PageHeader } from "@/components/ui-bits";
import {
  UNITS,
  addCategory,
  archiveOrDeleteProduct,
  fetchCategories,
  fetchInventory,
  saveProduct,
  type InventoryRow,
  type Unit,
} from "@/lib/data";
import { formatDate, money, num, qty } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/products")({
  head: () => ({
    meta: [
      { title: "Products — RetailBook Retail Manager" },
      {
        name: "description",
        content: "Create and manage your product catalogue with units, categories, minimum stock levels and default selling prices.",
      },
      { property: "og:title", content: "Products — RetailBook Retail Manager" },
      { property: "og:description", content: "Manage your retail product catalogue." },
    ],
  }),
  component: ProductsPage,
});

type Draft = {
  id?: string;
  name: string;
  sku: string;
  brand: string;
  category_id: string;
  unit: Unit;
  min_stock: string;
  default_price: string;
  description: string;
  active: boolean;
};

const emptyDraft: Draft = {
  name: "",
  sku: "",
  brand: "",
  category_id: "",
  unit: "PIECE",
  min_stock: "0",
  default_price: "0",
  description: "",
  active: true,
};

function ProductsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [newCategory, setNewCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [productToDelete, setProductToDelete] = useState<InventoryRow | null>(null);

  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const save = useMutation({
    mutationFn: () =>
      saveProduct({
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        sku: draft.sku.trim() || null,
        brand: draft.brand.trim() || null,
        category_id: draft.category_id || null,
        unit: draft.unit,
        min_stock: num(draft.min_stock),
        default_price: num(draft.default_price),
        description: draft.description.trim() || null,
        active: draft.active,
      }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setOpen(false);
      setDraft(emptyDraft);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCat = useMutation({
    mutationFn: () => addCategory(newCategory.trim()),
    onSuccess: (row) => {
      setNewCategory("");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDraft((d) => ({ ...d, category_id: (row as any).id }));
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: () => archiveOrDeleteProduct(productToDelete!.id),
    onSuccess: (result) => {
      toast.success(result.action === "deleted" ? t("products.deleted") : t("products.archived"));
      setProductToDelete(null);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (inventory.data ?? []).filter((p) => {
    if (statusFilter === "active" && !p.active) return false;
    if (statusFilter === "inactive" && p.active) return false;
    return [p.name, p.sku, p.brand].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });

  const edit = (p: InventoryRow) => {
    setDraft({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      brand: p.brand ?? "",
      category_id: p.category_id ?? "",
      unit: p.unit,
      min_stock: String(p.min_stock ?? 0),
      default_price: String(p.default_price ?? 0),
      description: "",
      active: p.active,
    });
    setOpen(true);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <PageHeader
        title={t("products.title")}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setDraft(emptyDraft);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> {t("products.add")}
          </Button>
        }
      />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("products.search")}
        className="max-w-sm"
      />

      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t("products.activeFilter")}</SelectItem>
          <SelectItem value="inactive">{t("products.archivedFilter")}</SelectItem>
          <SelectItem value="all">{t("products.allFilter")}</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="overflow-x-auto px-0">
          {inventory.isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.name")}</TableHead>
                  <TableHead>{t("common.category")}</TableHead>
                  <TableHead>{t("common.unit")}</TableHead>
                  <TableHead className="text-right">{t("products.stock")}</TableHead>
                  <TableHead className="text-right">{t("products.avgCost")}</TableHead>
                  <TableHead className="text-right">{t("products.defaultPrice")}</TableHead>
                  <TableHead className="text-right">{t("products.investment")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.sku, p.brand].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{p.category_name ?? "-"}</TableCell>
                    <TableCell className="text-sm">{t(`unit.${p.unit}`)}</TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={p.is_low_stock ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                        {qty(p.current_stock)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{money(p.avg_cost)}</TableCell>
                    <TableCell className="text-right text-sm">{money(p.default_price)}</TableCell>
                    <TableCell className="text-right text-sm">{money(p.total_investment)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.active ? t("common.active") : t("common.inactive")}
                      <br />
                      {p.last_purchase ? formatDate(p.last_purchase) : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => edit(p)}>
                          {t("common.edit")}
                        </Button>
                        {p.active ? (
                          <Button variant="ghost" size="sm" onClick={() => setProductToDelete(p)}>
                            <Trash2 className="mr-1 size-4" /> {t("common.delete")}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveProduct({ id: p.id, name: p.name, active: true })
                              .then(() => qc.invalidateQueries({ queryKey: ["inventory"] }))
                              .catch((e: Error) => toast.error(e.message))}
                          >
                            <RotateCcw className="mr-1 size-4" /> {t("products.restore")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? t("products.edit") : t("products.add")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t("products.name")}</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("products.sku")}</Label>
              <Input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.brand")}</Label>
              <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.category")}</Label>
              <Select value={draft.category_id} onValueChange={(v) => setDraft({ ...draft, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.none")} />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={t("common.category")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newCategory.trim() || addCat.isPending}
                  onClick={() => addCat.mutate()}
                >
                  {t("common.add")}
                </Button>
              </div>
            </div>
            <div>
              <Label>{t("common.unit")}</Label>
              <Select value={draft.unit} onValueChange={(v) => setDraft({ ...draft, unit: v as Unit })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`unit.${u}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("products.minStock")}</Label>
              <Input
                type="number"
                value={draft.min_stock}
                onChange={(e) => setDraft({ ...draft, min_stock: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("products.defaultPrice")}</Label>
              <Input
                type="number"
                value={draft.default_price}
                onChange={(e) => setDraft({ ...draft, default_price: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("products.description")}</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
              <Label>{t("common.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!draft.name.trim() || save.isPending} onClick={() => save.mutate()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{t("products.deleteQuestion")}</p>
                <p>
                  <strong>{productToDelete?.name}</strong>
                  {productToDelete?.sku ? ` · ${productToDelete.sku}` : ""}
                </p>
                <p>
                  {t("products.currentStock")}: {qty(productToDelete?.current_stock)} {productToDelete ? t(`unit.${productToDelete.unit}`) : ""}
                </p>
                {num(productToDelete?.current_stock) > 0 && (
                  <p className="font-medium text-destructive">
                    {t("products.stockDeleteWarning", {
                      stock: qty(productToDelete?.current_stock),
                      unit: productToDelete ? t(`unit.${productToDelete.unit}`) : "",
                    })}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteProduct.mutate()} disabled={deleteProduct.isPending}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
