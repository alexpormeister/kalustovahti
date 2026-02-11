import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

type ReportType = "vehicles" | "drivers" | "companies" | "hardware" | "quality_incidents" | "audit_logs";

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "vehicles", label: "Autot" },
  { value: "drivers", label: "Kuljettajat" },
  { value: "companies", label: "Autoilijat" },
  { value: "hardware", label: "Laitteet" },
  { value: "quality_incidents", label: "Laatupoikkeamat" },
  { value: "audit_logs", label: "Muutoslokit" },
];

const columnLabels: Record<string, Record<string, string>> = {
  vehicles: { vehicle_number: "Nro", registration_number: "Rekisteri", brand: "Merkki", model: "Malli", city: "Kaupunki", status: "Tila", created_at: "Luotu" },
  drivers: { driver_number: "Nro", full_name: "Nimi", phone: "Puhelin", email: "Email", city: "Kaupunki", province: "Maakunta", status: "Tila" },
  companies: { name: "Nimi", business_id: "Y-tunnus", contact_person: "Yhteyshenkilö", contact_email: "Email", contact_phone: "Puhelin", contract_status: "Sopimustila" },
  hardware: { serial_number: "Sarjanumero", device_type: "Tyyppi", status: "Tila", sim_number: "SIM", created_at: "Luotu" },
  quality_incidents: { incident_type: "Tyyppi", status: "Tila", incident_date: "Päivä", description: "Kuvaus", source: "Lähde" },
  audit_logs: { table_name: "Taulu", action: "Toiminto", description: "Kuvaus", created_at: "Aika" },
};

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("vehicles");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ["report", reportType],
    queryFn: async () => {
      let query: any;
      switch (reportType) {
        case "vehicles":
          query = supabase.from("vehicles").select("vehicle_number, registration_number, brand, model, city, status, created_at, id").order("vehicle_number");
          break;
        case "drivers":
          query = supabase.from("drivers").select("driver_number, full_name, phone, email, city, province, status, id").order("full_name");
          break;
        case "companies":
          query = supabase.from("companies").select("name, business_id, contact_person, contact_email, contact_phone, contract_status").order("name");
          break;
        case "hardware":
          query = supabase.from("hardware_devices").select("serial_number, device_type, status, sim_number, created_at").order("serial_number");
          break;
        case "quality_incidents":
          query = supabase.from("quality_incidents").select("incident_type, status, incident_date, description, source").order("incident_date", { ascending: false });
          break;
        case "audit_logs":
          query = supabase.from("audit_logs").select("table_name, action, description, created_at").order("created_at", { ascending: false }).limit(500);
          break;
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch vehicle attributes for filtering
  const { data: vehicleAttributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "vehicles",
  });

  // Fetch vehicle attribute links for filtering
  const { data: vehicleAttrLinks = [] } = useQuery({
    queryKey: ["vehicle-attr-links-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attribute_links").select("vehicle_id, attribute_id");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "vehicles" && selectedAttributes.length > 0,
  });

  // Fetch municipalities for city filter
  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "vehicles" || reportType === "drivers",
  });

  const columns = Object.keys(columnLabels[reportType] || {}).filter(c => c !== "id");
  const labels = columnLabels[reportType] || {};

  const filteredData = useMemo(() => {
    let data = reportData;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((row: any) => Object.values(row).some((v) => String(v || "").toLowerCase().includes(q)));
    }

    if (dateFrom || dateTo) {
      data = data.filter((row: any) => {
        const dateField = row.created_at || row.incident_date;
        if (!dateField) return true;
        const d = new Date(dateField);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      });
    }

    if (cityFilter) {
      data = data.filter((row: any) => row.city === cityFilter);
    }

    if (statusFilter) {
      data = data.filter((row: any) => row.status === statusFilter);
    }

    // Filter by vehicle attributes
    if (reportType === "vehicles" && selectedAttributes.length > 0) {
      const vehicleIdsWithAttrs = new Set(
        vehicleAttrLinks
          .filter((link: any) => selectedAttributes.includes(link.attribute_id))
          .map((link: any) => link.vehicle_id)
      );
      // Require ALL selected attributes
      data = data.filter((row: any) => {
        const vehicleLinks = vehicleAttrLinks.filter((link: any) => link.vehicle_id === row.id);
        return selectedAttributes.every(attrId => vehicleLinks.some((link: any) => link.attribute_id === attrId));
      });
    }

    return data;
  }, [reportData, searchQuery, dateFrom, dateTo, cityFilter, statusFilter, selectedAttributes, vehicleAttrLinks, reportType]);

  const { currentPage, setCurrentPage, totalPages, paginatedData, startIndex, endIndex, totalItems } = usePagination(filteredData, { pageSize: 50 });

  const exportCSV = () => {
    if (filteredData.length === 0) { toast.error("Ei dataa vietäväksi"); return; }
    const header = columns.map((c) => labels[c]).join(";");
    const rows = filteredData.map((row: any) =>
      columns.map((c) => {
        const val = row[c];
        if (val === null || val === undefined) return "";
        if (c === "created_at" || c === "incident_date") {
          try { return format(new Date(val), "d.M.yyyy HH:mm", { locale: fi }); } catch { return val; }
        }
        return String(val).replace(/;/g, ",");
      }).join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `raportti_${reportType}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Raportti viety (${filteredData.length} riviä)`);
  };

  const resetFilters = () => {
    setSearchQuery(""); setDateFrom(""); setDateTo(""); setCityFilter(""); setStatusFilter(""); setSelectedAttributes([]);
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || cityFilter || statusFilter || selectedAttributes.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Raportit</h1>
            <p className="text-muted-foreground mt-1">Luo ja lataa raportteja järjestelmän datasta</p>
          </div>
          <Button className="gap-2" onClick={exportCSV} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4" />Lataa CSV ({filteredData.length} riviä)
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <Label>Raporttityyppi</Label>
            <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); resetFilters(); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{reportTypes.map((rt) => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hae raportin sisällöstä..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant={showAdvanced ? "default" : "outline"} onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
            <Filter className="h-4 w-4" />Suodattimet
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1"><X className="h-4 w-4" />Tyhjennä</Button>
          )}
        </div>

        {showAdvanced && (
          <Card className="glass-card">
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label>Alkaen</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label>Saakka</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
                {(reportType === "vehicles" || reportType === "drivers") && municipalities.length > 0 && (
                  <div className="space-y-1">
                    <Label>Kaupunki</Label>
                    <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        {municipalities.map((m: any) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(reportType === "vehicles" || reportType === "drivers" || reportType === "hardware") && (
                  <div className="space-y-1">
                    <Label>Tila</Label>
                    <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        <SelectItem value="active">Aktiivinen</SelectItem>
                        <SelectItem value="removed">Poistettu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {reportType === "vehicles" && vehicleAttributes.length > 0 && (
                <div>
                  <Label className="mb-2 block">Suodata attribuuteilla</Label>
                  <div className="flex flex-wrap gap-3">
                    {vehicleAttributes.map((attr: any) => (
                      <div key={attr.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`report-attr-${attr.id}`}
                          checked={selectedAttributes.includes(attr.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAttributes((prev) => checked ? [...prev, attr.id] : prev.filter((id) => id !== attr.id));
                          }}
                        />
                        <label htmlFor={`report-attr-${attr.id}`} className="text-sm cursor-pointer">{attr.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              {reportTypes.find((r) => r.value === reportType)?.label} ({filteredData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Ladataan...</p>
            ) : filteredData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Ei dataa</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>{columns.map((col) => <TableHead key={col}>{labels[col]}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row: any, i: number) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col} className="max-w-[200px] truncate">
                              {col === "created_at" || col === "incident_date"
                                ? (row[col] ? format(new Date(row[col]), "d.M.yyyy HH:mm", { locale: fi }) : "—")
                                : (row[col] ?? "—")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}