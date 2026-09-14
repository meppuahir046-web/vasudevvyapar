import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { paymentStatus } from "@/lib/format";

export function PaymentBadge({ total, paid }: { total: number; paid: number }) {
  const { t } = useI18n();
  const status = paymentStatus(total, paid);
  const variant = status === "paid" ? "default" : status === "partial" ? "secondary" : "destructive";
  return <Badge variant={variant}>{t(`sales.status.${status}`)}</Badge>;
}
