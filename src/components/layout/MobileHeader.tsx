import { Menu, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const roleLabels: Record<string, string> = {
  system_admin: "Pääkäyttäjä",
  contract_manager: "Sopimushallinta",
  hardware_ops: "Laitehallinta",
  support: "Asiakaspalvelu",
  admin: "Admin",
  manager: "Manageri",
  driver: "Kuljettaja",
};

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-mobile-header"],
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="text-sidebar-foreground"
      >
        <Menu className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Car className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-sidebar-primary">
            Kalustovahti
          </span>
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
    </header>
  );
}
