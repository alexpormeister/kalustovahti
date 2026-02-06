import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  Users,
  Building2,
  Settings,
  LogOut,
  Tag,
  Smartphone,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions, PageKey } from "@/hooks/usePermissions";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  pageKey: PageKey;
}

const navigation: NavigationItem[] = [
  { name: "Hallintapaneeli", href: "/dashboard", icon: LayoutDashboard, pageKey: "dashboard" },
  { name: "Autoilijat", href: "/autoilijat", icon: Building2, pageKey: "autoilijat" },
  { name: "Kalustolista", href: "/kalusto", icon: Car, pageKey: "kalusto" },
  { name: "Laitevarasto", href: "/laitteet", icon: Smartphone, pageKey: "laitteet" },
  { name: "Kuljettajat", href: "/kuljettajat", icon: Users, pageKey: "kuljettajat" },
  { name: "Attribuutit", href: "/varustelu", icon: Tag, pageKey: "varustelu" },
  { name: "Laadunvalvonta", href: "/laadunvalvonta", icon: ClipboardCheck, pageKey: "laadunvalvonta" },
  { name: "Asetukset", href: "/asetukset", icon: Settings, pageKey: "asetukset" },
  { name: "Käyttäjät", href: "/kayttajat", icon: Users, pageKey: "kayttajat" },
];

interface SidebarProps {
  onLogout?: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onLogout, onNavigate, isMobile }: SidebarProps) {
  const location = useLocation();
  const { isSystemAdmin, permissions, isLoading } = usePermissions();

  // Filter navigation items based on permissions
  const visibleNavigation = navigation.filter((item) => {
    if (isLoading) return true; // Show all while loading
    return permissions[item.pageKey]?.can_view;
  });

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className={cn(
      "bg-sidebar border-r border-sidebar-border",
      isMobile ? "h-full w-full" : "fixed left-0 top-0 z-40 h-screen w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo - only show on desktop */}
        {!isMobile && (
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
              <Car className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-primary">
                Lähitaksi
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Kumppanihallinta
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 space-y-1 px-3", isMobile ? "py-6" : "py-4")}>
          {visibleNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  "sidebar-nav-item",
                  isActive && "sidebar-nav-item-active"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {/* Role Management - Only for system admins */}
          {isSystemAdmin && (
            <Link
              to="/roolit"
              onClick={handleNavClick}
              className={cn(
                "sidebar-nav-item",
                location.pathname === "/roolit" && "sidebar-nav-item-active"
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Roolien hallinta</span>
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={onLogout}
            className="sidebar-nav-item w-full text-left hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Kirjaudu ulos</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
