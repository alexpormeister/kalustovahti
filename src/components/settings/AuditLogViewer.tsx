import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, ChevronLeft, ChevronRight, Eye, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { Json } from "@/integrations/supabase/types";

const tableLabels: Record<string, string> = {
  vehicles: "Ajoneuvot",
  companies: "Yritykset",
  hardware_devices: "Laitteet",
  profiles: "Käyttäjät",
  company_contracts: "Sopimukset",
  vehicle_attributes: "Varustelu",
  vehicle_attribute_links: "Varustelulinkitykset",
};

const actionLabels: Record<string, string> = {
  create: "Luotu",
  update: "Päivitetty",
  delete: "Poistettu",
};

const actionColors: Record<string, string> = {
  create: "bg-status-available text-status-available-foreground",
  update: "bg-status-maintenance text-status-maintenance-foreground",
  delete: "bg-destructive text-destructive-foreground",
};

const fieldLabels: Record<string, string> = {
  full_name: "Nimi",
  phone: "Puhelin",
  driver_number: "Kuljettajanumero",
  driver_license_valid_until: "Ajokortti voimassa",
  vehicle_number: "Autonumero",
  registration_number: "Rekisterinumero",
  brand: "Merkki",
  model: "Malli",
  status: "Tila",
  meter_serial_number: "Mittarin sarjanumero",
  payment_terminal_id: "Maksupääte-ID",
  name: "Nimi",
  business_id: "Y-tunnus",
  address: "Osoite",
  contact_person: "Yhteyshenkilö",
  contact_email: "Sähköposti",
  contact_phone: "Puhelin",
  contract_status: "Sopimustila",
  serial_number: "Sarjanumero",
  device_type: "Laitetyyppi",
  sim_number: "SIM-numero",
  description: "Kuvaus",
  assigned_driver_id: "Kuljettaja",
  company_id: "Yritys",
  vehicle_id: "Ajoneuvo",
};

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Json | null;
  new_data: Json | null;
  description: string | null;
  created_at: string;
}

interface ChangeDetail {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

function getChanges(oldData: Json | null, newData: Json | null, action: string): ChangeDetail[] {
  if (action === "create" && newData && typeof newData === "object" && !Array.isArray(newData)) {
    // For create, show all new fields
    return Object.entries(newData as Record<string, unknown>)
      .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
      .map(([field, value]) => ({
        field,
        oldValue: null,
        newValue: value != null ? String(value) : null,
      }));
  }

  if (action === "delete" && oldData && typeof oldData === "object" && !Array.isArray(oldData)) {
    // For delete, show what was deleted
    return Object.entries(oldData as Record<string, unknown>)
      .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
      .map(([field, value]) => ({
        field,
        oldValue: value != null ? String(value) : null,
        newValue: null,
      }));
  }

  if (action === "update" && oldData && newData && 
      typeof oldData === "object" && typeof newData === "object" &&
      !Array.isArray(oldData) && !Array.isArray(newData)) {
    // For update, show changed fields
    const changes: ChangeDetail[] = [];
    const oldRecord = oldData as Record<string, unknown>;
    const newRecord = newData as Record<string, unknown>;
    
    for (const key of Object.keys(newRecord)) {
      if (["id", "created_at", "updated_at"].includes(key)) continue;
      
      const oldValue = oldRecord[key];
      const newValue = newRecord[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue != null ? String(oldValue) : null,
          newValue: newValue != null ? String(newValue) : null,
        });
      }
    }
    return changes;
  }

  return [];
}

export function AuditLogViewer({ isAdmin }: { isAdmin: boolean }) {
  const [page, setPage] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as AuditLog[], count: count || 0 };
    },
    enabled: isAdmin,
  });

  const { data: users = {} } = useQuery({
    queryKey: ["audit-log-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");
      
      const map: Record<string, string> = {};
      profiles?.forEach(p => {
        map[p.id] = p.full_name || "Tuntematon";
      });
      return map;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  const totalPages = Math.ceil((data?.count || 0) / pageSize);

  const formatChangesSummary = (log: AuditLog): string => {
    const changes = getChanges(log.old_data, log.new_data, log.action);
    if (changes.length === 0) return log.description || "—";
    
    if (log.action === "update") {
      return changes.slice(0, 2).map(c => {
        const label = fieldLabels[c.field] || c.field;
        return `${label}: "${c.oldValue || "—"}" → "${c.newValue || "—"}"`;
      }).join(", ") + (changes.length > 2 ? ` (+${changes.length - 2} muuta)` : "");
    }
    
    if (log.action === "create") {
      const nameField = changes.find(c => 
        ["full_name", "name", "vehicle_number", "serial_number"].includes(c.field)
      );
      return nameField ? `Uusi: ${nameField.newValue}` : "Uusi tietue luotu";
    }
    
    if (log.action === "delete") {
      const nameField = changes.find(c => 
        ["full_name", "name", "vehicle_number", "serial_number"].includes(c.field)
      );
      return nameField ? `Poistettu: ${nameField.oldValue}` : "Tietue poistettu";
    }
    
    return log.description || "—";
  };

  return (
    <>
      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Muutosloki</CardTitle>
                <CardDescription>Järjestelmän muutoshistoria</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Kaikki" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki taulukot</SelectItem>
                  {Object.entries(tableLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
          ) : !data?.logs.length ? (
            <div className="text-center py-8 text-muted-foreground">Ei lokimerkintöjä</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Aika</TableHead>
                      <TableHead className="w-32">Käyttäjä</TableHead>
                      <TableHead className="w-28">Toiminto</TableHead>
                      <TableHead className="w-28">Taulukko</TableHead>
                      <TableHead>Muutokset</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {users[log.user_id] || "Järjestelmä"}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || ""}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {tableLabels[log.table_name] || log.table_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                          {formatChangesSummary(log)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Näytetään {page * pageSize + 1}-{Math.min((page + 1) * pageSize, data.count)} / {data.count}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Muutoksen tiedot</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Aika</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "d.M.yyyy HH:mm:ss", { locale: fi })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Käyttäjä</p>
                  <p className="font-medium">{users[selectedLog.user_id] || "Järjestelmä"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Toiminto</p>
                  <Badge className={actionColors[selectedLog.action] || ""}>
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Taulukko</p>
                  <p className="font-medium">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Muutetut kentät</h4>
                <div className="border rounded-lg divide-y">
                  {getChanges(selectedLog.old_data, selectedLog.new_data, selectedLog.action).map((change, i) => (
                    <div key={i} className="p-3 flex items-center gap-4">
                      <span className="font-medium min-w-32">
                        {fieldLabels[change.field] || change.field}
                      </span>
                      {selectedLog.action === "update" ? (
                        <div className="flex items-center gap-2 text-sm flex-1">
                          <span className="text-destructive bg-destructive/10 px-2 py-1 rounded">
                            {change.oldValue || "—"}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-status-available bg-status-available/10 px-2 py-1 rounded">
                            {change.newValue || "—"}
                          </span>
                        </div>
                      ) : selectedLog.action === "create" ? (
                        <span className="text-sm text-status-available">
                          {change.newValue || "—"}
                        </span>
                      ) : (
                        <span className="text-sm text-destructive">
                          {change.oldValue || "—"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
