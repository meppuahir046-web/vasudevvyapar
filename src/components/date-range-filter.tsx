import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { presetRange, type DateRange, type RangePreset } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRESETS: RangePreset[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "all",
  "custom",
];

export function DateRangeFilter({
  preset,
  range,
  onPreset,
  onRange,
}: {
  preset: RangePreset;
  range: DateRange;
  onPreset: (p: RangePreset) => void;
  onRange: (r: DateRange) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={preset === p ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => {
              onPreset(p);
              if (p !== "custom") onRange(presetRange(p));
            }}
          >
            {t(`range.${p}`)}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={range.from}
            onChange={(e) => onRange({ ...range, from: e.target.value })}
            className="h-9 w-auto"
          />
          <span className="text-sm text-muted-foreground">{t("common.to")}</span>
          <Input
            type="date"
            value={range.to}
            onChange={(e) => onRange({ ...range, to: e.target.value })}
            className="h-9 w-auto"
          />
        </div>
      )}
    </div>
  );
}

export function PresetPills({
  value,
  onChange,
  presets = ["today", "thisMonth", "thisYear", "all"] as RangePreset[],
}: {
  value: RangePreset;
  onChange: (p: RangePreset, range: DateRange) => void;
  presets?: RangePreset[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={value === p ? "default" : "outline"}
          className={cn("h-8 text-xs")}
          onClick={() => onChange(p, presetRange(p))}
        >
          {t(`range.${p}`)}
        </Button>
      ))}
    </div>
  );
}
