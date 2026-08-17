import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Moon,
  Package,
  PackagePlus,
  Receipt,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Sun,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { fetchSettings, globalSearch } from "@/lib/data";
import { money } from "@/lib/format";
import { signOut } from "@/hooks/useAuth";

type NavItem = { to: string; labelKey: string; icon: typeof LayoutDashboard };

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/sales/new", labelKey: "nav.newSale", icon: ShoppingCart },
  { to: "/customers", labelKey: "nav.customers", icon: Users },
  { to: "/products", labelKey: "nav.products", icon: Package },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { to: "/purchases", labelKey: "nav.purchases", icon: PackagePlus },
  { to: "/sales", labelKey: "nav.sales", icon: Receipt },
  { to: "/payments", labelKey: "nav.payments", icon: IndianRupee },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon },
];

const BOTTOM: NavItem[] = [NAV[0]!, NAV[1]!, NAV[2]!, NAV[6]!];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("retailbook.theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("retailbook.theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return { dark, toggle };
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["global-search", term],
    queryFn: () => globalSearch(term),
    enabled: term.trim().length > 1,
  });

  const go = (to: string, params?: Record<string, string>) => {
    setOpen(false);
    setTerm("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to, params } as any);
  };

  const hasResults =
    !!data && (data.customers.length > 0 || data.products.length > 0 || data.sales.length > 0);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={t("search.global")}
        className="pl-9"
      />
      {open && term.trim().length > 1 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {!hasResults && <p className="px-3 py-3 text-sm text-muted-foreground">{t("search.noResults")}</p>}
          {data?.customers.map((c) => (
            <button
              key={c.id}
              onMouseDown={() => go("/customers/$id", { id: c.id })}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                {c.name}
              </span>
              <span className="text-xs text-muted-foreground">{c.mobile}</span>
            </button>
          ))}
          {data?.products.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => go("/inventory")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Package className="size-3.5 text-muted-foreground" />
              {p.name}
            </button>
          ))}
          {data?.sales.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => go("/sales/$id", { id: s.id })}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Receipt className="size-3.5 text-muted-foreground" />
                {s.invoice_no}
              </span>
              <span className="text-xs text-muted-foreground">{money(s.total)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const brand = (
    <div className="px-3 py-4">
      <p className="text-base font-bold tracking-tight">{settings?.business_name || t("app.name")}</p>
      <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-sidebar p-2 lg:flex">
        {brand}
        <NavLinks />
        <div className="mt-auto p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="size-4" />
            {t("auth.signOut")}
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.more")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-2">
              <SheetTitle className="sr-only">{t("app.name")}</SheetTitle>
              {brand}
              <NavLinks onNavigate={() => setMenuOpen(false)} />
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                {t("auth.signOut")}
              </Button>
            </SheetContent>
          </Sheet>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "en" ? "gu" : "en")}
              aria-label={t("settings.language")}
            >
              {lang === "en" ? "ગુજરાતી" : "English"}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("settings.theme")}>
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-4 lg:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed bottom-0 z-40 flex w-full items-stretch border-t bg-background lg:hidden">
        {BOTTOM.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <item.icon className="size-5" />
            {t(item.labelKey)}
          </Link>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
        >
          <MoreHorizontal className="size-5" />
          {t("nav.more")}
        </button>
      </nav>
    </div>
  );
}
