import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { DataImportExport } from "@/components/settings/DataImportExport";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";

export default function Settings() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsAdmin(data?.role === "system_admin");
      }
    };
    checkAdmin();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Asetukset</h1>
          <p className="text-muted-foreground mt-1">
            Hallitse järjestelmän asetuksia
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <ProfileSettings />

          {/* System Settings */}
          <SystemSettings isAdmin={isAdmin} />

          {/* Data Import/Export */}
          <DataImportExport isAdmin={isAdmin} />

          {/* Audit Log Viewer */}
          <AuditLogViewer isAdmin={isAdmin} />
        </div>
      </div>
    </DashboardLayout>
  );
}
