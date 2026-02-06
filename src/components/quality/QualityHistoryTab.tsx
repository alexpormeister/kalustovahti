import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { cn } from "@/lib/utils";

type IncidentType = 
  | "customer_complaint"
  | "service_quality"
  | "vehicle_condition"
  | "driver_behavior"
  | "safety_issue"
  | "billing_issue"
  | "other";

type IncidentStatus = "new" | "investigating" | "resolved" | "closed";

interface QualityIncident {
  id: string;
  incident_date: string;
  incident_type: IncidentType;
  source: string | null;
  description: string;
  action_taken: string | null;
  status: IncidentStatus;
  created_at: string;
  vehicle?: { registration_number: string; vehicle_number: string } | null;
  driver?: { full_name: string | null; driver_number: string | null } | null;
  creator?: { full_name: string | null } | null;
}

interface QualityHistoryTabProps {
  vehicleId?: string;
  driverId?: string;
}

const incidentTypeLabels: Record<IncidentType, string> = {
  customer_complaint: "Asiakasvalitus",
  service_quality: "Palvelun laatu",
  vehicle_condition: "Ajoneuvon kunto",
  driver_behavior: "Kuljettajan käytös",
  safety_issue: "Turvallisuus",
  billing_issue: "Laskutus",
  other: "Muu",
};

const statusLabels: Record<IncidentStatus, string> = {
  new: "Uusi",
  investigating: "Tutkinnassa",
  resolved: "Ratkaistu",
  closed: "Suljettu",
};

const statusColors: Record<IncidentStatus, string> = {
  new: "bg-blue-500/20 text-blue-700 border-blue-300",
  investigating: "bg-amber-500/20 text-amber-700 border-amber-300",
  resolved: "bg-emerald-500/20 text-emerald-700 border-emerald-300",
  closed: "bg-muted text-muted-foreground border-border",
};

export function QualityHistoryTab({ vehicleId, driverId }: QualityHistoryTabProps) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["quality-history", vehicleId, driverId],
    queryFn: async () => {
      let query = supabase
        .from("quality_incidents")
        .select(`
          *,
          vehicle:vehicles(registration_number, vehicle_number)
        `)
        .order("incident_date", { ascending: false });

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }
      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch driver and creator info separately
      const incidentsWithDetails = await Promise.all(
        (data || []).map(async (incident: any) => {
          let driver = null;
          let creator = null;

          if (incident.driver_id) {
            const { data: driverData } = await supabase
              .from("profiles")
              .select("full_name, driver_number")
              .eq("id", incident.driver_id)
              .single();
            driver = driverData;
          }

          if (incident.created_by) {
            const { data: creatorData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", incident.created_by)
              .single();
            creator = creatorData;
          }

          return { ...incident, driver, creator };
        })
      );

      return incidentsWithDetails as QualityIncident[];
    },
    enabled: !!(vehicleId || driverId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Ladataan...
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <ClipboardCheck className="h-8 w-8 mb-2" />
        <p>Ei laatutapauksia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">Pvm</TableHead>
            <TableHead className="font-semibold text-foreground">Tyyppi</TableHead>
            {!vehicleId && (
              <TableHead className="font-semibold text-foreground">Ajoneuvo</TableHead>
            )}
            {!driverId && (
              <TableHead className="font-semibold text-foreground">Kuljettaja</TableHead>
            )}
            <TableHead className="font-semibold text-foreground">Kuvaus</TableHead>
            <TableHead className="font-semibold text-foreground">Toimenpiteet</TableHead>
            <TableHead className="font-semibold text-foreground">Tila</TableHead>
            <TableHead className="font-semibold text-foreground">Käsittelijä</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => (
            <TableRow key={incident.id} className="border-border hover:bg-muted/50">
              <TableCell className="font-medium">
                {format(new Date(incident.incident_date), "d.M.yyyy", { locale: fi })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {incidentTypeLabels[incident.incident_type]}
                </Badge>
              </TableCell>
              {!vehicleId && (
                <TableCell>
                  {incident.vehicle?.registration_number || "—"}
                </TableCell>
              )}
              {!driverId && (
                <TableCell>{incident.driver?.full_name || "—"}</TableCell>
              )}
              <TableCell className="max-w-[200px]">
                <p className="truncate" title={incident.description}>
                  {incident.description}
                </p>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="truncate" title={incident.action_taken || ""}>
                  {incident.action_taken || "—"}
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border", statusColors[incident.status])}
                >
                  {statusLabels[incident.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {incident.creator?.full_name || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
