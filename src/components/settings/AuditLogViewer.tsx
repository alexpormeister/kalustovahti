import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { History, ChevronLeft, ChevronRight, Eye, ArrowRight, ArrowUpDown, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { Json } from "@/integrations/supabase/types";

const tableLabels: Record<string, string> = {
  vehicles: "Ajoneuvot", companies: "Yritykset", hardware_devices: "Laitteet",
  profiles: "Käyttäjät", company_contracts: "Sopimukset", vehicle_attributes: "Varustelu",
  vehicle_attribute_links: "Varustelulinkitykset", drivers: "Kuljettajat",
  driver_documents: "Kuljettajadokumentit", company_documents: "Yrityksen dokumentit",
  driver_attribute_links: "Kuljettaja-attribuutit", quality_incidents: "Laatupoikkeamat",
};

const actionLabels: Record<string, string> = {
  create: "Luotu", update: "Päivitetty", delete: "Poistettu", view_ssn: "HETU katselu", export: "Vienti",
};

const actionColors: Record<string, string> = {
  create: "bg-status-available text-status-available-foreground",
  update: "bg-status-maintenance text-status-maintenance-foreground",
  delete: "bg-destructive text-destructive-foreground",
  view_ssn: "bg-primary/20 text-primary",
  export: "bg-muted text-muted-foreground",
};

const fieldLabels: Record<string, string> = {
  full_name: "Nimi", phone: "Puhelin", driver_number: "Kuljettajanumero",
  driver_license_valid_until: "Ajokortti voimassa", vehicle_number: "Autonumero",
  registration_number: "Rekisterinumero", brand: "Merkki", model: "Malli",
  status: "Tila", meter_serial_number: "Mittarin sarjanumero",
  payment_terminal_id: "Maksupääte-ID", name: "Nimi", business_id: "Y-tunnus",
  address: "Osoite", contact_person: "Yhteyshenkilö", contact_email: "Sähköposti",
  contact_phone: "Puhelin", contract_status: "Sopimustila", serial_number: "Sarjanumero",
  device_type: "Laitetyyppi", sim_number: "SIM-numero", description: "Kuvaus",
  assigned_driver_id: "Kuljettaja", company_id: "Yritys", vehicle_id: "Ajoneuvo",
  file_name: "Tiedostonimi", document_type_id: "Dokumenttityyppi",
  viewer_name: "Katsoja", driver_name: "Kuljettaja",
};

interface AuditLog {
  id: string; user_id: string; action: string; table_name: string;
  record_id: string; old_data: Json | null; new_data: Json | null;
  description: string | null; created_at: string;
}

interface ChangeDetail {
  field: string; oldValue: string | null; newValue: string | null;
}

type SortField = "created_at" | "action" | "table_name";
type SortDir = "asc" | "desc";

function getChanges(oldData: Json | null, newData: Json | null, action: string): ChangeDetail[] {
  if (action === "create" && newData && typeof newData === "object" && !Array.isArray(newData)) {
    return Object.entries(newData as Record<string, unknown>)
      .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
      .map(([field, value]) => ({ field, oldValue: null, newValue: value != null ? String(value) : null }));
  }
  if (action === "delete" && oldData && typeof oldData === "object" && !Array.isArray(oldData)) {
    return Object.entries(oldData as Record<string, unknown>)
      .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))
      .map(([field, value]) => ({ field, oldValue: value != null ? String(value) : null, newValue: null }));
  }
  if (action === "update" && oldData && newData && typeof oldData === "object" && typeof newData === "object" && !Array.isArray(oldData) && !Array.isArray(newData)) {
    const changes: ChangeDetail[] = [];
    const oldRecord = oldData as Record<string, unknown>;
    const newRecord = newData as Record<string, unknown>;
    for (const key of Object.keys(newRecord)) {
      if (["id", "created_at", "updated_at"].includes(key)) continue;
      if (JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])) {
        changes.push({ field: key, oldValue: oldRecord[key] != null ? String(oldRecord[key]) : null, newValue: newRecord[key] != null ? String(newRecord[key]) : null });
      }
    }
    return changes;
  }
  return [];
}

export function AuditLogViewer({ isAdmin }: { isAdmin: boolean }) {
  const [page, setPage] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;

  // Lookup maps for human-readable IDs
  const { data: driversMap = {} } = useQuery({
    queryKey: ["audit-drivers-map"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, driver_number, full_name");
      const map: Record<string, { number: string; name: string }> = {};
      data?.forEach(d => { map[d.id] = { number: d.driver_number, name: d.full_name }; });
      return map;
    },
    enabled: isAdmin, staleTime: 60000,
  });

  const { data: vehiclesMap = {} } = useQuery({
    queryKey: ["audit-vehicles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, vehicle_number, registration_number");
      const map: Record<string, { number: string; reg: string }> = {};
      data?.forEach(v => { map[v.id] = { number: v.vehicle_number, reg: v.registration_number }; });
      return map;
    },
    enabled: isAdmin, staleTime: 60000,
  });

  const { data: documentTypesMap = {} } = useQuery({
    queryKey: ["audit-doctypes-map"],
    queryFn: async () => {
      const { data } = await supabase.from("document_types").select("id, name");
      const map: Record<string, string> = {};
      data?.forEach(d => { map[d.id] = d.name; });
      return map;
    },
    enabled: isAdmin, staleTime: 60000,
  });

  const { data: companiesMap = {} } = useQuery({
    queryKey: ["audit-companies-map"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      const map: Record<string, string> = {};
      data?.forEach(c => { map[c.id] = c.name; });
      return map;
    },
    enabled: isAdmin, staleTime: 60000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, tableFilter, actionFilter, sortField, sortDir, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order(sortField, { ascending: sortDir === "asc" })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (dateFrom) query = query.gte("created_at", dateFrom + "T00:00:00");
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data as AuditLog[], count: count || 0 };
    },
    enabled: isAdmin,
  });

  const { data: users = {} } = useQuery({
    queryKey: ["audit-log-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, first_name, last_name");
      const map: Record<string, string> = {};
      profiles?.forEach(p => {
        map[p.id] = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Tuntematon";
      });
      return map;
    },
    enabled: isAdmin,
  });

  // Resolve UUID references to human-readable values
  const resolveValue = (field: string, value: string | null): string => {
    if (!value) return "—";
    if (field === "assigned_driver_id" || field === "driver_id") {
      const d = driversMap[value];
      return d ? `#${d.number} ${d.name}` : value;
    }
    if (field === "vehicle_id") {
      const v = vehiclesMap[value];
      return v ? `#${v.number} (${v.reg})` : value;
    }
    if (field === "company_id") return companiesMap[value] || value;
    if (field === "document_type_id") return documentTypesMap[value] || value;
    if (field === "uploaded_by" || field === "created_by" || field === "updated_by") return users[value] || value;
    return value;
  };

  // Client-side search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery || !data?.logs) return data?.logs || [];
    const q = searchQuery.toLowerCase();
    return data.logs.filter(log => {
      const userName = users[log.user_id] || "";
      const tableName = tableLabels[log.table_name] || log.table_name;
      const actionName = actionLabels[log.action] || log.action;
      return userName.toLowerCase().includes(q) || tableName.toLowerCase().includes(q) ||
        actionName.toLowerCase().includes(q) || (log.description || "").toLowerCase().includes(q);
    });
  }, [data?.logs, searchQuery, users]);

  if (!isAdmin) return null;

  const totalPages = Math.ceil((data?.count || 0) / pageSize);
  const hasActiveFilters = tableFilter !== "all" || actionFilter !== "all" || searchQuery || dateFrom || dateTo;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  };

  const resetFilters = () => {
    setTableFilter("all"); setActionFilter("all"); setSearchQuery(""); setDateFrom(""); setDateTo(""); setPage(0);
  };

  // Build a clear Finnish description of what happened
  const formatChangesSummary = (log: AuditLog): string => {
    // Always prefer the database-generated description if available
    if (log.description) return log.description;

    const tableName = tableLabels[log.table_name] || log.table_name;
    const changes = getChanges(log.old_data, log.new_data, log.action);
    const findName = (data: Json | null): string => {
      if (!data || typeof data !== "object" || Array.isArray(data)) return "";
      const d = data as Record<string, unknown>;
      return String(d.full_name || d.name || d.vehicle_number || d.serial_number || d.file_name || d.display_name || "");
    };

    if (log.action === "view_ssn") return "HETU-tiedon katselu";
    if (log.action === "export") return "Raportti viety";

    if (log.action === "create") {
      const name = findName(log.new_data);
      return name ? `Lisäsi kohteen "${name}" (${tableName})` : `Lisäsi uuden kohteen (${tableName})`;
    }
    if (log.action === "update") {
      const name = findName(log.new_data);
      const target = name ? `"${name}"` : "kohdetta";
      if (changes.length === 0) return `Muokkasi ${target} (${tableName})`;
      const detail = changes.slice(0, 2).map(c => {
        const label = fieldLabels[c.field] || c.field;
        return `${label}: "${resolveValue(c.field, c.oldValue)}" → "${resolveValue(c.field, c.newValue)}"`;
      }).join(", ") + (changes.length > 2 ? ` (+${changes.length - 2} muuta)` : "");
      return `Muokkasi ${target}: ${detail}`;
    }
    if (log.action === "delete") {
      const name = findName(log.old_data);
      return name ? `Poisti kohteen "${name}" (${tableName})` : `Poisti kohteen (${tableName})`;
    }
    return "—";
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Hae lokista..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Taulukko" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki kohteet</SelectItem>
                {Object.entries(tableLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Toiminto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki toiminnot</SelectItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} placeholder="Alkaen" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} placeholder="Saakka" />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <X className="h-3 w-3" />Tyhjennä suodattimet
            </Button>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
          ) : !filteredLogs.length ? (
            <div className="text-center py-8 text-muted-foreground">Ei lokimerkintöjä</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40 cursor-pointer" onClick={() => toggleSort("created_at")}>
                        <div className="flex items-center gap-1">Aika <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="w-32">Käyttäjä</TableHead>
                      <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort("action")}>
                        <div className="flex items-center gap-1">Toiminto <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort("table_name")}>
                        <div className="flex items-center gap-1">Kohde <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead>Kuvaus</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}
                        </TableCell>
                        <TableCell className="text-sm">{users[log.user_id] || "Järjestelmä"}</TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || ""}>{actionLabels[log.action] || log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tableLabels[log.table_name] || log.table_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{formatChangesSummary(log)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Sivu {page + 1} / {totalPages} ({data?.count || 0} merkintää)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
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
          <DialogHeader><DialogTitle>Muutoksen tiedot</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div><p className="text-muted-foreground">Aika</p><p className="font-medium">{format(new Date(selectedLog.created_at), "d.M.yyyy HH:mm:ss", { locale: fi })}</p></div>
                <div><p className="text-muted-foreground">Käyttäjä</p><p className="font-medium">{users[selectedLog.user_id] || "Järjestelmä"}</p></div>
                <div><p className="text-muted-foreground">Toiminto</p><Badge className={actionColors[selectedLog.action] || ""}>{actionLabels[selectedLog.action] || selectedLog.action}</Badge></div>
                <div><p className="text-muted-foreground">Kohde</p><p className="font-medium">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</p></div>
              </div>

              {selectedLog.description && (
                <div><p className="text-muted-foreground text-sm">Kuvaus</p><p className="text-sm font-medium">{selectedLog.description}</p></div>
              )}

              <div>
                <h4 className="font-medium mb-2">Muutetut kentät</h4>
                <div className="border rounded-lg divide-y">
                  {getChanges(selectedLog.old_data, selectedLog.new_data, selectedLog.action).map((change, i) => (
                    <div key={i} className="p-3 flex items-center gap-4">
                      <span className="font-medium min-w-32">{fieldLabels[change.field] || change.field}</span>
                      {selectedLog.action === "update" ? (
                        <div className="flex items-center gap-2 text-sm flex-1">
                          <span className="text-destructive bg-destructive/10 px-2 py-1 rounded">{resolveValue(change.field, change.oldValue)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-status-available bg-status-available/10 px-2 py-1 rounded">{resolveValue(change.field, change.newValue)}</span>
                        </div>
                      ) : selectedLog.action === "create" ? (
                        <span className="text-sm text-status-available">{resolveValue(change.field, change.newValue)}</span>
                      ) : (
                        <span className="text-sm text-destructive">{resolveValue(change.field, change.oldValue)}</span>
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
