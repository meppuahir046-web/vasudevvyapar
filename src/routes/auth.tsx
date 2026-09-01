import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ensureProfile, saveSettings } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RetailBook Retail Manager" },
      {
        name: "description",
        content: "Sign in to RetailBook to manage inventory, customers, sales, invoices and payments in English or Gujarati.",
      },
      { property: "og:title", content: "Sign in — RetailBook Retail Manager" },
      { property: "og:description", content: "Access your retail inventory, sales and payment records." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success(t("auth.resetSent"));
        setMode("in");
        return;
      }
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success(t("auth.checkEmail"));
          return;
        }
        await ensureProfile(fullName);
        if (businessName.trim()) await saveSettings({ business_name: businessName.trim(), owner_name: fullName });
        navigate({ to: "/dashboard" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfile();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("app.name")}</CardTitle>
          <CardDescription>{mode === "up" ? t("auth.subtitle") : t("auth.welcome")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <>
                <div>
                  <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="businessName">{t("auth.businessName")}</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "reset" && (
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "in" ? t("auth.signIn") : mode === "up" ? t("auth.signUp") : t("auth.reset")}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={async () => {
                try {
                  await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("common.error"));
                }
              }}
            >
              {t("auth.google")}
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-1 text-center text-sm">
            <button className="text-primary hover:underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
              {mode === "up" ? t("auth.haveAccount") : t("auth.needAccount")}
            </button>
            {mode !== "reset" && (
              <button className="text-muted-foreground hover:underline" onClick={() => setMode("reset")}>
                {t("auth.forgot")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
