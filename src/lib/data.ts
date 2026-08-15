import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "@/lib/format";

export type Unit =
  | "KG"
  | "GRAM"
  | "LITER"
  | "ML"
  | "PIECE"
  | "BOX"
  | "PACKET"
  | "BOTTLE"
  | "DOZEN"
  | "OTHER";

export const UNITS: Unit[] = [
  "KG",
  "GRAM",
  "LITER",
  "ML",
  "PIECE",
  "BOX",
  "PACKET",
  "BOTTLE",
  "DOZEN",
  "OTHER",
];

export const PAYMENT_METHODS = ["CASH", "UPI", "BANK", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category_id: string | null;
  unit: Unit;
  min_stock: number;
  default_price: number;
  description: string | null;
  active: boolean;
  is_demo: boolean;
  created_at: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  unit: Unit;
  min_stock: number;
  active: boolean;
  default_price: number;
  category_id: string | null;
  category_name: string | null;
  total_purchased: number;
  total_sold: number;
  current_stock: number;
  total_investment: number;
  avg_cost: number;
  stock_value: number;
  total_revenue: number;
  total_profit: number;
  last_purchase: string | null;
  last_sale: string | null;
  is_low_stock: boolean;
};

export type CustomerRow = {
  id: string;
  name: string;
  mobile: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  active: boolean;
  is_demo: boolean;
  created_at: string;
};

export type CustomerSummaryRow = {
  id: string;
  name: string;
  mobile: string | null;
  whatsapp: string | null;
  city: string | null;
  address: string | null;
  active: boolean;
  created_at: string;
  orders: number;
  total_purchased: number;
  total_paid: number;
  total_pending: number;
  total_profit: number;
  last_sale: string | null;
};

export type SaleRow = {
  id: string;
  invoice_no: string;
  customer_id: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  cogs: number;
  profit: number;
  status: "ACTIVE" | "CANCELLED";
  notes: string | null;
  created_at: string;
  customers?: { name: string; mobile: string | null; whatsapp: string | null } | null;
  sale_items?: SaleItemRow[];
};

export type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  returned_quantity: number;
  unit: Unit;
  rate: number;
  amount: number;
  unit_cost: number;
  cost_total: number;
  profit: number;
  products?: { name: string; sku: string | null } | null;
};

export type PaymentRow = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  is_reversal: boolean;
  paid_at: string;
  customers?: { name: string } | null;
  sales?: { invoice_no: string } | null;
};

export type PurchaseRow = {
  id: string;
  product_id: string;
  supplier_id: string | null;
  purchase_date: string;
  quantity: number;
  unit: Unit;
  total_amount: number;
  cost_per_unit: number;
  invoice_no: string | null;
  notes: string | null;
  products?: { name: string; unit: Unit } | null;
  suppliers?: { name: string } | null;
};

export type BusinessSettings = {
  owner_id: string;
  business_name: string;
  owner_name: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  gst_number: string | null;
  logo_url: string | null;
  invoice_prefix: string;
  invoice_counter: number;
  currency: string;
  invoice_footer: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ---------------- settings & profile ---------------- */

export async function fetchSettings(): Promise<BusinessSettings | null> {
  await db.rpc("ensure_business_settings");
  const res = await db.from("business_settings").select("*").maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data as BusinessSettings | null;
}

export async function saveSettings(patch: Partial<BusinessSettings>) {
  const { data: userData } = await supabase.auth.getUser();
  const owner = userData.user?.id;
  if (!owner) throw new Error("NOT_AUTHENTICATED");
  return unwrap(await db.from("business_settings").upsert({ owner_id: owner, ...patch }).select().single());
}

export async function ensureProfile(fullName?: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;
  await db.from("profiles").upsert(
    { id: user.id, email: user.email, ...(fullName ? { full_name: fullName } : {}) },
    { onConflict: "id" },
  );
  await db.rpc("ensure_business_settings");
}

/* ---------------- products ---------------- */

export async function fetchProducts(includeInactive = true): Promise<ProductRow[]> {
  let q = db.from("products").select("*").order("name");
  if (!includeInactive) q = q.eq("active", true);
  return unwrap<ProductRow[]>(await q);
}

export async function fetchInventory(): Promise<InventoryRow[]> {
  return unwrap<InventoryRow[]>(await db.from("v_product_inventory").select("*").order("name"));
}

export async function saveProduct(p: Partial<ProductRow> & { name: string }) {
  if (p.id) {
    return unwrap(await db.from("products").update(p).eq("id", p.id).select().single());
  }
  return unwrap(await db.from("products").insert(p).select().single());
}

export async function fetchCategories() {
  return unwrap<{ id: string; name: string }[]>(await db.from("categories").select("*").order("name"));
}

export async function addCategory(name: string) {
  return unwrap(await db.from("categories").insert({ name }).select().single());
}

export async function fetchSuppliers() {
  return unwrap<{ id: string; name: string }[]>(await db.from("suppliers").select("*").order("name"));
}

export async function addSupplier(name: string, phone?: string) {
  return unwrap(await db.from("suppliers").insert({ name, phone }).select().single());
}

/* ---------------- purchases & ledger ---------------- */

export async function fetchPurchases(range?: DateRange, productId?: string): Promise<PurchaseRow[]> {
  let q = db
    .from("stock_purchases")
    .select("*, products(name, unit), suppliers(name)")
    .order("purchase_date", { ascending: false });
  if (range) q = q.gte("purchase_date", range.from).lte("purchase_date", range.to);
  if (productId) q = q.eq("product_id", productId);
  return unwrap<PurchaseRow[]>(await q);
}

export async function addPurchase(input: {
  product_id: string;
  supplier_id?: string | null;
  purchase_date: string;
  quantity: number;
  unit: Unit;
  total_amount: number;
  invoice_no?: string | null;
  notes?: string | null;
}) {
  return unwrap(await db.from("stock_purchases").insert(input).select().single());
}

export async function fetchLedger(productId?: string, range?: DateRange) {
  let q = db
    .from("inventory_transactions")
    .select("*, products(name, unit)")
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (productId) q = q.eq("product_id", productId);
  if (range) q = q.gte("txn_date", range.from).lte("txn_date", range.to);
  return unwrap<
    {
      id: string;
      product_id: string;
      txn_type: string;
      quantity: number;
      unit_cost: number | null;
      txn_date: string;
      notes: string | null;
      reference_type: string | null;
      products?: { name: string; unit: Unit } | null;
    }[]
  >(await q);
}

/* ---------------- customers ---------------- */

export async function fetchCustomers(search = ""): Promise<CustomerRow[]> {
  let q = db.from("customers").select("*").order("name");
  if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,mobile.ilike.%${search.trim()}%`);
  return unwrap<CustomerRow[]>(await q);
}

export async function fetchCustomerSummaries(): Promise<CustomerSummaryRow[]> {
  return unwrap<CustomerSummaryRow[]>(await db.from("v_customer_summary").select("*").order("name"));
}

export async function fetchCustomer(id: string): Promise<CustomerRow> {
  return unwrap(await db.from("customers").select("*").eq("id", id).single());
}

export async function fetchCustomerSummary(id: string): Promise<CustomerSummaryRow> {
  return unwrap(await db.from("v_customer_summary").select("*").eq("id", id).single());
}

export async function saveCustomer(c: Partial<CustomerRow> & { name: string }) {
  if (c.id) return unwrap(await db.from("customers").update(c).eq("id", c.id).select().single());
  return unwrap(await db.from("customers").insert(c).select().single());
}

/* ---------------- customer prices ---------------- */

export async function fetchCustomerPrices(customerId: string) {
  return unwrap<{ id: string; product_id: string; selling_price: number }[]>(
    await db.from("customer_product_prices").select("*").eq("customer_id", customerId),
  );
}

export async function saveCustomerPrice(customerId: string, productId: string, price: number, unit?: Unit) {
  return unwrap(
    await db
      .from("customer_product_prices")
      .upsert(
        { customer_id: customerId, product_id: productId, selling_price: price, unit: unit ?? null },
        { onConflict: "customer_id,product_id" },
      )
      .select()
      .single(),
  );
}

export async function deleteCustomerPrice(customerId: string, productId: string) {
  const res = await db
    .from("customer_product_prices")
    .delete()
    .eq("customer_id", customerId)
    .eq("product_id", productId);
  if (res.error) throw new Error(res.error.message);
}

/* ---------------- sales ---------------- */

export async function fetchSales(opts: {
  range?: DateRange;
  customerId?: string;
  search?: string;
  status?: "ACTIVE" | "CANCELLED";
} = {}): Promise<SaleRow[]> {
  let q = db
    .from("sales")
    .select("*, customers(name, mobile, whatsapp)")
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.range) q = q.gte("sale_date", opts.range.from).lte("sale_date", opts.range.to);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.search?.trim()) q = q.ilike("invoice_no", `%${opts.search.trim()}%`);
  return unwrap<SaleRow[]>(await q);
}

export async function fetchSale(id: string): Promise<SaleRow> {
  return unwrap(
    await db
      .from("sales")
      .select("*, customers(*), sale_items(*, products(name, sku))")
      .eq("id", id)
      .single(),
  );
}

export async function fetchSaleItems(opts: { range?: DateRange; productId?: string; customerId?: string } = {}) {
  let q = db
    .from("sale_items")
    .select("*, products(name, sku), sales!inner(invoice_no, sale_date, customer_id, status, customers(name, mobile))")
    .order("created_at", { ascending: false });
  if (opts.productId) q = q.eq("product_id", opts.productId);
  if (opts.customerId) q = q.eq("sales.customer_id", opts.customerId);
  if (opts.range) q = q.gte("sales.sale_date", opts.range.from).lte("sales.sale_date", opts.range.to);
  return unwrap<
    (SaleItemRow & {
      sales: {
        invoice_no: string;
        sale_date: string;
        customer_id: string;
        status: string;
        customers?: { name: string; mobile: string | null } | null;
      };
    })[]
  >(await q);
}

export type NewSaleItem = { product_id: string; quantity: number; rate: number };

export async function createSale(input: {
  customer_id: string;
  items: NewSaleItem[];
  sale_date: string;
  discount: number;
  paid: number;
  method: PaymentMethod;
  notes?: string;
  save_prices: boolean;
}): Promise<string> {
  const res = await db.rpc("create_sale", {
    p_customer_id: input.customer_id,
    p_items: input.items,
    p_sale_date: input.sale_date,
    p_discount: input.discount,
    p_paid: input.paid,
    p_payment_method: input.method,
    p_notes: input.notes ?? null,
    p_save_prices: input.save_prices,
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as string;
}

export async function cancelSale(saleId: string, reason?: string) {
  const res = await db.rpc("cancel_sale", { p_sale_id: saleId, p_reason: reason ?? null });
  if (res.error) throw new Error(res.error.message);
}

export async function createSaleReturn(
  saleId: string,
  items: { sale_item_id: string; quantity: number }[],
  notes?: string,
) {
  const res = await db.rpc("create_sale_return", {
    p_sale_id: saleId,
    p_items: items,
    p_notes: notes ?? null,
    p_return_date: new Date().toISOString().slice(0, 10),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as string;
}

/* ---------------- payments ---------------- */

export async function fetchPayments(opts: { range?: DateRange; customerId?: string; saleId?: string } = {}) {
  let q = db
    .from("payments")
    .select("*, customers(name), sales(invoice_no)")
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.range) q = q.gte("paid_at", opts.range.from).lte("paid_at", opts.range.to);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.saleId) q = q.eq("sale_id", opts.saleId);
  return unwrap<PaymentRow[]>(await q);
}

export async function addPayment(input: {
  customer_id: string;
  sale_id: string | null;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paid_at: string;
}) {
  return unwrap(await db.from("payments").insert(input).select().single());
}

/* ---------------- returns ---------------- */

export async function fetchReturns(range?: DateRange) {
  let q = db
    .from("sale_returns")
    .select("*, customers(name), sales(invoice_no), sale_return_items(*, products(name))")
    .order("return_date", { ascending: false });
  if (range) q = q.gte("return_date", range.from).lte("return_date", range.to);
  return unwrap<
    {
      id: string;
      return_date: string;
      total_amount: number;
      total_cost: number;
      notes: string | null;
      customers?: { name: string } | null;
      sales?: { invoice_no: string } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sale_return_items?: any[];
    }[]
  >(await q);
}

/* ---------------- demo data ---------------- */

export async function seedDemoData() {
  const res = await db.rpc("seed_demo_data");
  if (res.error) throw new Error(res.error.message);
}

export async function resetDemoData() {
  const res = await db.rpc("reset_demo_data");
  if (res.error) throw new Error(res.error.message);
}

/* ---------------- global search ---------------- */

export async function globalSearch(term: string) {
  const s = term.trim();
  if (!s) return { customers: [], products: [], sales: [] };
  const [customers, products, sales] = await Promise.all([
    db.from("customers").select("id, name, mobile").or(`name.ilike.%${s}%,mobile.ilike.%${s}%`).limit(6),
    db.from("products").select("id, name, sku").or(`name.ilike.%${s}%,sku.ilike.%${s}%`).limit(6),
    db.from("sales").select("id, invoice_no, total, customers(name)").ilike("invoice_no", `%${s}%`).limit(6),
  ]);
  return {
    customers: (customers.data ?? []) as { id: string; name: string; mobile: string | null }[],
    products: (products.data ?? []) as { id: string; name: string; sku: string | null }[],
    sales: (sales.data ?? []) as { id: string; invoice_no: string; total: number; customers?: { name: string } }[],
  };
}

export function friendlyError(message: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (message.includes("INSUFFICIENT_STOCK")) {
    const name = message.split("INSUFFICIENT_STOCK:")[1]?.trim();
    return `${t("sales.insufficientStock")}${name ? ` — ${name}` : ""}`;
  }
  if (message.includes("PAYMENT_EXCEEDS_OUTSTANDING")) return t("payments.exceeds");
  if (message.includes("RETURN_EXCEEDS_SOLD")) return t("returns.exceeds");
  if (message.includes("NO_ITEMS")) return t("sales.noItems");
  if (message.includes("INVALID_QUANTITY") || message.includes("INVALID_PRICE") || message.includes("INVALID_DISCOUNT"))
    return t("common.error");
  return message || t("common.error");
}
