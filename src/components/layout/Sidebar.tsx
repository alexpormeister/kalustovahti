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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Hallintapaneeli", href: "/dashboard", icon: LayoutDashboard },
  { name: "Autoilijat", href: "/autoilijat", icon: Building2 },
  { name: "Kalustolista", href: "/kalusto", icon: Car },
  { name: "Laitevarasto", href: "/laitteet", icon: Smartphone },
  { name: "Kuljettajat", href: "/kuljettajat", icon: Users },
  { name: "Attribuutit", href: "/varustelu", icon: Tag },
  { name: "Laadunvalvonta", href: "/laadunvalvonta", icon: ClipboardCheck },
  { name: "Asetukset", href: "/asetukset", icon: Settings },
  { name: "Käyttäjät", href: "/kayttajat", icon: Users },
];

interface SidebarProps {
  onLogout?: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
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
