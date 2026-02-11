import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, Building2, Settings, LogOut, Tag,
  Smartphone, ClipboardCheck, ShieldCheck, FileCheck, ChevronDown,
  Wrench, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions, PageKey } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  pageKey: PageKey;
}

interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
  defaultCollapsed?: boolean;
}

const navigationGroups: NavigationGroup[] = [
  {
    items: [
      { name: "Hallintapaneeli", href: "/dashboard", icon: LayoutDashboard, pageKey: "dashboard" },
    ],
  },
  {
    label: "Hallinta",
    defaultCollapsed: true,
    items: [
      { name: "Autoilijat", href: "/autoilijat", icon: Building2, pageKey: "autoilijat" },
      { name: "Autot", href: "/kalusto", icon: Car, pageKey: "kalusto" },
      { name: "Kuljettajat", href: "/kuljettajat", icon: Users, pageKey: "kuljettajat" },
      { name: "Laitevarasto", href: "/laitteet", icon: Smartphone, pageKey: "laitteet" },
    ],
  },
  {
    items: [
      { name: "Dokumentit", href: "/dokumentit", icon: FileCheck, pageKey: "dokumentit" },
      
      { name: "Laadunvalvonta", href: "/laadunvalvonta", icon: ClipboardCheck, pageKey: "laadunvalvonta" },
      { name: "Raportit", href: "/raportit", icon: FileSpreadsheet, pageKey: "raportit" },
    ],
  },
  {
    items: [
      { name: "Asetukset", href: "/asetukset", icon: Settings, pageKey: "asetukset" },
      { name: "Käyttäjät", href: "/kayttajat", icon: Users, pageKey: "kayttajat" },
    ],
  },
];

const roleLabels: Record<string, string> = {
  system_admin: "Pääkäyttäjä",
  contract_manager: "Sopimushallinta",
  hardware_ops: "Laitehallinta",
  support: "Asiakaspalvelu",
  admin: "Admin",
  manager: "Manageri",
  driver: "Kuljettaja",
};

interface SidebarProps {
  onLogout?: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onLogout, onNavigate, isMobile }: SidebarProps) {
  const location = useLocation();
  const { isSystemAdmin, permissions, isLoading } = usePermissions();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navigationGroups.forEach((g) => {
      if (g.label && g.defaultCollapsed) {
        const isOnGroupPage = g.items.some((item) => location.pathname === item.href || location.pathname.startsWith(item.href + "/"));
        if (!isOnGroupPage) initial.add(g.label);
      }
    });
    return initial;
  });

  // Fetch current user profile and role
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-sidebar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
      ]);
      return {
        name: profileRes.data?.full_name || user.email?.split("@")[0] || "Käyttäjä",
        role: roleRes.data?.role || "user",
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isItemVisible = (item: NavigationItem) => {
    if (isLoading) return true;
    return permissions[item.pageKey]?.can_view;
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={cn("bg-sidebar border-r border-sidebar-border", isMobile ? "h-full w-full" : "fixed left-0 top-0 z-40 h-screen w-64")}>
      <div className="flex h-full flex-col">
        {!isMobile && (
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
              <Car className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-sidebar-primary truncate">Kalustovahti</span>
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-sidebar-foreground/80 truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-sidebar-foreground/50">•</span>
                  <span className="text-[10px] text-sidebar-foreground/50 truncate">{roleLabels[currentUser.role] || currentUser.role}</span>
                </div>
              ) : (
                <span className="text-xs text-sidebar-foreground/60">Kumppanihallinta</span>
              )}
            </div>
          </div>
        )}

        <nav className={cn("flex-1 space-y-1 px-3 overflow-y-auto", isMobile ? "py-6" : "py-4")}>
          {navigationGroups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;

            if (group.label) {
              const isCollapsed = collapsedGroups.has(group.label);
              return (
                <div key={group.label} className="pt-2">
                  <button
                    onClick={() => toggleGroup(group.label!)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                        return (
                          <Link key={item.name} to={item.href} onClick={handleNavClick} className={cn("sidebar-nav-item pl-6", isActive && "sidebar-nav-item-active")}>
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={groupIndex} className={groupIndex > 0 ? "pt-2 border-t border-sidebar-border mt-2" : ""}>
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                  return (
                    <Link key={item.name} to={item.href} onClick={handleNavClick} className={cn("sidebar-nav-item", isActive && "sidebar-nav-item-active")}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {isSystemAdmin && (
            <div className="pt-2 border-t border-sidebar-border mt-2">
              <Link to="/yllapito" onClick={handleNavClick} className={cn("sidebar-nav-item", location.pathname === "/yllapito" && "sidebar-nav-item-active")}>
                <Wrench className="h-5 w-5" />
                <span className="font-medium">Ylläpito</span>
              </Link>
              <Link to="/roolit" onClick={handleNavClick} className={cn("sidebar-nav-item", location.pathname === "/roolit" && "sidebar-nav-item-active")}>
                <ShieldCheck className="h-5 w-5" />
                <span className="font-medium">Roolien hallinta</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button onClick={onLogout} className="sidebar-nav-item w-full text-left hover:bg-destructive/20 hover:text-destructive">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Kirjaudu ulos</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
