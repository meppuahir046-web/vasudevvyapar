import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loading, PageHeader } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { fetchSettings, resetDemoData, saveSettings, seedDemoData, type BusinessSettings } from "@/lib/data";
import { signOut } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Business Settings — RetailBook" },
      {
        name: "description",
        content:
          "Update business profile, invoice prefix, GST details, language and theme preferences for your retail shop.",
      },
      { property: "og:title", content: "Business Settings — RetailBook" },
      { property: "og:description", content: "Configure invoice branding, language and demo data." },
    ],
  }),
  component: SettingsPage,
});

type FormState = Partial<BusinessSettings>;

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({});
  const [dark, setDark] = useState(false);

  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const setTheme = (next: boolean) => {
    setDark(next);
    window.localStorage.setItem("retailbook.theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        business_name: (form.business_name ?? "").trim() || "My Retail Shop",
        owner_name: form.owner_name ?? null,
        address: form.address ?? null,
        city: form.city ?? null,
        phone: form.phone ?? null,
        whatsapp: form.whatsapp ?? null,
        email: form.email ?? null,
        gst_number: form.gst_number ?? null,
        logo_url: form.logo_url ?? null,
        invoice_prefix: (form.invoice_prefix ?? "INV").trim() || "INV",
        currency: form.currency ?? "INR",
        invoice_footer: form.invoice_footer ?? null,
      }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const demo = useMutation({
    mutationFn: (mode: "seed" | "reset") => (mode === "seed" ? seedDemoData() : resetDemoData()),
    onSuccess: (_d, mode) => {
      toast.success(mode === "seed" ? t("settings.demoCreated") : t("settings.demoDeleted"));
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (key: keyof BusinessSettings, label: string, type = "text") => (
    <div>
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        type={type}
        value={(form[key] as string | null) ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  if (settings.isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={t("settings.title")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            {t("auth.signOut")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.business")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {field("business_name", t("settings.businessName"))}
            {field("owner_name", t("settings.ownerName"))}
            {field("phone", t("customers.mobile"))}
            {field("whatsapp", t("customers.whatsapp"))}
            {field("email", t("auth.email"), "email")}
            {field("address", t("customers.address"))}
            {field("city", t("customers.city"))}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("invoice.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {field("gst_number", t("settings.gst"))}
              {field("invoice_prefix", t("settings.invoicePrefix"))}
              {field("currency", t("settings.currency"))}
              {field("logo_url", t("settings.logo"))}
              <div>
                <Label htmlFor="invoice_footer">{t("settings.invoiceFooter")}</Label>
                <Textarea
                  id="invoice_footer"
                  value={form.invoice_footer ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_footer: e.target.value }))}
                />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {t("common.save")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("settings.language")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>
                English
              </Button>
              <Button variant={lang === "gu" ? "default" : "outline"} size="sm" onClick={() => setLang("gu")}>
                ગુજરાતી
              </Button>
              <Button variant={dark ? "outline" : "default"} size="sm" onClick={() => setTheme(false)}>
                {t("settings.light")}
              </Button>
              <Button variant={dark ? "default" : "outline"} size="sm" onClick={() => setTheme(true)}>
                {t("settings.dark")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("settings.demoData")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={demo.isPending} onClick={() => demo.mutate("seed")}>
                {t("settings.createDemo")}
              </Button>
              <Button variant="destructive" size="sm" disabled={demo.isPending} onClick={() => demo.mutate("reset")}>
                {t("settings.resetDemo")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
