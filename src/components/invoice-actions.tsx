import { Download, MessageCircle, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { formatDate, money } from "@/lib/format";
import { downloadInvoicePdf, saleToInvoice, shareInvoice } from "@/lib/pdf";
import { invoiceLabels } from "@/lib/invoice-labels";
import type { BusinessSettings, SaleRow } from "@/lib/data";
import { toast } from "sonner";

export function useInvoiceLabels() {
  const { t } = useI18n();
  return invoiceLabels(t);
}

export function InvoiceActions({
  sale,
  settings,
  compact,
}: {
  sale: SaleRow;
  settings: BusinessSettings | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const labels = useInvoiceLabels();

  const invoiceData = () => saleToInvoice(sale, settings, labels);

  const shareText = t("invoices.shareText", {
    inv: sale.invoice_no,
    total: money(sale.total),
    paid: money(sale.paid_amount),
    pending: money(sale.pending_amount),
  });

  const handleDownload = async () => {
    try {
      await downloadInvoicePdf(invoiceData());
    } catch {
      toast.error(t("common.downloadUnavailable"));
    }
  };

  const handlePrint = async () => {
    try {
      const { buildInvoicePdf } = await import("@/lib/pdf");
      const { blobToAndroidPayload, sendFileToAndroid } = await import("@/lib/android-bridge");
      const doc = await buildInvoicePdf(invoiceData());
      const fileName = `${sale.invoice_no}.pdf`;
      const blob = doc.output("blob");
      const payload = await blobToAndroidPayload(blob, fileName);
      if (sendFileToAndroid("printFile", payload)) return;
      doc.autoPrint();
      const url = URL.createObjectURL(blob);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.width = "1px";
      frame.style.height = "1px";
      frame.style.opacity = "0";
      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
          frame.remove();
        }, 1000);
      };
      document.body.appendChild(frame);
    } catch {
      toast.error(t("common.printUnavailable"));
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareInvoice(
        invoiceData(),
        shareText,
        sale.customers?.whatsapp ?? sale.customers?.mobile,
      );
      if (result === "downloaded") toast.info(t("invoices.pdfReady"));
    } catch {
      toast.error(t("common.shareUnavailable"));
    }
  };

  const handleWhatsapp = async () => {
    const digits = (sale.customers?.mobile ?? "").replace(/\D/g, "");
    const phoneNumber = digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : digits;

    if (!/^91[6-9]\d{9}$/.test(phoneNumber)) {
      toast.error("Customer WhatsApp number is not available.");
      return;
    }

    const customerName = sale.customers?.name ?? "Customer";
    const businessName = settings?.business_name ?? "Vasudev Retail Shop";
    const message = [
      `Hello ${customerName},`,
      "",
      `Thank you for your purchase from ${businessName}.`,
      "",
      `Invoice No: ${sale.invoice_no}`,
      `Date: ${formatDate(sale.sale_date)}`,
      `Total: ₹${money(sale.total)}`,
      `Paid: ₹${money(sale.paid_amount)}`,
      `Pending: ₹${money(sale.pending_amount)}`,
      "",
      `Thank you,`,
      businessName,
    ].join("\n");

    window.location.assign(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
  };

  const size = compact ? "sm" : "default";

  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} variant="outline" onClick={handleDownload}>
        <Download className="mr-1 size-4" />
        {t("invoices.download")}
      </Button>
      <Button size={size} variant="outline" onClick={handlePrint}>
        <Printer className="mr-1 size-4" />
        {t("common.print")}
      </Button>
      <Button size={size} variant="outline" onClick={handleShare}>
        <Share2 className="mr-1 size-4" />
        {t("common.share")}
      </Button>
      <Button size={size} variant="outline" onClick={handleWhatsapp}>
        <MessageCircle className="mr-1 size-4" />
        {t("invoices.shareWhatsapp")}
      </Button>
    </div>
  );
}
