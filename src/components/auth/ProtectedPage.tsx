import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePagePermission, PageKey } from "@/hooks/usePermissions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedPageProps {
  pageKey: PageKey;
  children: ReactNode;
  requireEdit?: boolean;
}

export function ProtectedPage({ pageKey, children, requireEdit = false }: ProtectedPageProps) {
  const navigate = useNavigate();
  const { can_view, can_edit, isLoading } = usePagePermission(pageKey);

  const hasAccess = requireEdit ? can_edit : can_view;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ladataan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <ShieldX className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">Ei käyttöoikeuksia</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Sinulla ei ole oikeuksia tähän sivuun. Ota yhteyttä järjestelmänvalvojaan jos tarvitset pääsyn.
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Palaa etusivulle
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}

// Hook to check if user can edit on current page
export function useCanEdit(pageKey: PageKey): boolean {
  const { can_edit, isLoading } = usePagePermission(pageKey);
  return !isLoading && can_edit;
}
