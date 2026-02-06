import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Uloskirjautuminen epäonnistui");
    } else {
      toast.success("Kirjauduit ulos onnistuneesti");
      navigate("/auth");
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar onLogout={handleLogout} onNavigate={() => setSidebarOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
        <main className="pt-16">
          <div className="p-4">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
