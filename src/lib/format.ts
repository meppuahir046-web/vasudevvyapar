export const CURRENCY_SYMBOL = "₹";

export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function moneyPlain(value: number | string | null | undefined): number {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export function qty(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type DateRange = { from: string; to: string };

export type RangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "all"
  | "custom";

export function presetRange(preset: RangePreset): DateRange {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (preset) {
    case "yesterday":
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case "thisWeek": {
      const day = (now.getDay() + 6) % 7;
      start.setDate(now.getDate() - day);
      break;
    }
    case "thisMonth":
      start.setDate(1);
      break;
    case "lastMonth":
      start.setMonth(now.getMonth() - 1, 1);
      end.setMonth(now.getMonth(), 0);
      break;
    case "thisYear":
      start.setMonth(0, 1);
      break;
    case "all":
      start.setFullYear(2000, 0, 1);
      break;
    default:
      break;
  }
  return { from: toISODate(start), to: toISODate(end) };
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function paymentStatus(total: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid >= total - 0.009) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}
