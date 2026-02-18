import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeviceTypeManager } from "@/components/settings/DeviceTypeManager";
import { DocumentTypeManager } from "@/components/settings/DocumentTypeManager";
import { SharedAttachmentManager } from "@/components/settings/SharedAttachmentManager";
import { DataImportExport } from "@/components/settings/DataImportExport";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";
import { FleetManager } from "@/components/settings/FleetManager";
import { CompanyInfoManager } from "@/components/settings/CompanyInfoManager";
import { MunicipalityManager } from "@/components/settings/MunicipalityManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Building2, Layers, Cpu, FileText, MapPin, Database, History, Tag, Palette } from "lucide-react";
import { AttributeManager } from "@/components/settings/AttributeManager";
import { ThemeColorPicker } from "@/components/settings/ThemeColorPicker";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

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
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {isOpen ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function Maintenance() {
  return (
    <ProtectedPage pageKey="yllapito">
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

            <CollapsibleSection title="Dokumenttityypit & Liitteet" icon={<FileText className="h-5 w-5 text-primary" />}>
              <div className="space-y-6">
                <DocumentTypeManager />
                <div className="border-t pt-6">
                  <SharedAttachmentManager />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Kunnat" icon={<MapPin className="h-5 w-5 text-primary" />}>
              <MunicipalityManager />
            </CollapsibleSection>

            <CollapsibleSection title="Attribuutit" icon={<Tag className="h-5 w-5 text-primary" />}>
              <AttributeManager />
            </CollapsibleSection>

            <CollapsibleSection title="Teemaväri" icon={<Palette className="h-5 w-5 text-primary" />}>
              <ThemeColorPicker />
            </CollapsibleSection>

            <CollapsibleSection title="Data" icon={<Database className="h-5 w-5 text-primary" />}>
              <DataImportExport isAdmin={true} />
            </CollapsibleSection>

            <CollapsibleSection title="Muutoslokit" icon={<History className="h-5 w-5 text-primary" />}>
              <AuditLogViewer isAdmin={true} />
            </CollapsibleSection>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}
