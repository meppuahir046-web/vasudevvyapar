import { AlertCircle, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function PageLoading() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <span>{t("common.loading")}</span>
    </div>
  );
}

export function PageError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <p className="text-sm text-muted-foreground">{message || t("common.error")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.update")}
        </Button>
      )}
    </div>
  );
}

export function PageEmpty({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <PackageOpen className="size-10 opacity-50" />
      <p className="text-sm">{message || t("common.empty")}</p>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {children}
    </div>
  );
}
