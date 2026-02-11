import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { DeviceTypeManager } from "@/components/settings/DeviceTypeManager";
import { DocumentTypeManager } from "@/components/settings/DocumentTypeManager";
import { DataImportExport } from "@/components/settings/DataImportExport";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";
import { FleetManager } from "@/components/settings/FleetManager";
import { CompanyInfoManager } from "@/components/settings/CompanyInfoManager";
import { toast } from "sonner";

export default function Maintenance() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        const admin = data?.role === "system_admin";
        setIsAdmin(admin);
        if (!admin) {
          navigate("/dashboard");
          toast.error("Sinulla ei ole oikeuksia tähän sivuun");
        }
      }
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  if (loading || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Ladataan...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ylläpito</h1>
          <p className="text-muted-foreground mt-1">
            Hallitse järjestelmän ylläpitoasetuksia
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CompanyInfoManager />
          <FleetManager />
          <DeviceTypeManager />
          <DocumentTypeManager />
          <DataImportExport isAdmin={isAdmin} />
          <AuditLogViewer isAdmin={isAdmin} />
        </div>
      </div>
    </DashboardLayout>
  );
}
