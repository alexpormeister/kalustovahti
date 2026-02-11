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
import { MunicipalityManager } from "@/components/settings/MunicipalityManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Building2, Layers, Cpu, FileText, MapPin, Database, History } from "lucide-react";
import { toast } from "sonner";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base">
            {icon}
            {title}
          </CardTitle>
          <div className="p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors">
            {isOpen ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="border-t pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

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

        <div className="space-y-4">
          <CollapsibleSection title="Yritystiedot" icon={<Building2 className="h-5 w-5 text-primary" />}>
            <CompanyInfoManager />
          </CollapsibleSection>

          <CollapsibleSection title="Fleetit" icon={<Layers className="h-5 w-5 text-primary" />}>
            <FleetManager />
          </CollapsibleSection>

          <CollapsibleSection title="Laitetyypit" icon={<Cpu className="h-5 w-5 text-primary" />}>
            <DeviceTypeManager />
          </CollapsibleSection>

          <CollapsibleSection title="Dokumenttityypit" icon={<FileText className="h-5 w-5 text-primary" />}>
            <DocumentTypeManager />
          </CollapsibleSection>

          <CollapsibleSection title="Kunnat" icon={<MapPin className="h-5 w-5 text-primary" />}>
            <MunicipalityManager />
          </CollapsibleSection>

          <CollapsibleSection title="Data" icon={<Database className="h-5 w-5 text-primary" />}>
            <DataImportExport isAdmin={isAdmin} />
          </CollapsibleSection>

          <CollapsibleSection title="Muutoslokit" icon={<History className="h-5 w-5 text-primary" />}>
            <AuditLogViewer isAdmin={isAdmin} />
          </CollapsibleSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
