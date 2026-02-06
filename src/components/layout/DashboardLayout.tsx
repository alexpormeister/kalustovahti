import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Uloskirjautuminen epäonnistui");
    } else {
      toast.success("Kirjauduit ulos onnistuneesti");
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
