import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { presetRange, type DateRange, type RangePreset } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-lg font-bold lg:text-xl", toneClass)}>{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useI18n();
  return <p className="py-10 text-center text-sm text-muted-foreground">{message ?? t("common.empty")}</p>;
}

export function Loading() {
  const { t } = useI18n();
  return <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
}

const PRESETS: RangePreset[] = ["today", "yesterday", "thisWeek", "thisMonth", "lastMonth", "thisYear", "all"];

export function RangeFilter({
  preset,
  range,
  onChange,
}: {
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-40">
        <Label className="text-xs text-muted-foreground">{t("common.filter")}</Label>
        <Select
          value={preset}
          onValueChange={(v) => {
            const p = v as RangePreset;
            onChange(p, p === "custom" ? range : presetRange(p));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`range.${p}`)}
              </SelectItem>
            ))}
            <SelectItem value="custom">{t("range.custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t("common.from")}</Label>
        <Input
          type="date"
          value={range.from}
          onChange={(e) => onChange("custom", { ...range, from: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t("common.to")}</Label>
        <Input type="date" value={range.to} onChange={(e) => onChange("custom", { ...range, to: e.target.value })} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "paid" | "partial" | "unpaid" | "cancelled" }) {
  const { t } = useI18n();
  const map = {
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    unpaid: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    cancelled: "bg-muted text-muted-foreground",
  } as const;
  const label = status === "cancelled" ? t("sales.cancelled") : t(`sales.status.${status}`);
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", map[status])}>{label}</span>
  );
}

export function ExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}
