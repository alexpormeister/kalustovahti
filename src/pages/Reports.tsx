import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Search, Filter, X, BarChart3, PieChart, Image } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

type ReportType = "vehicles" | "drivers" | "companies" | "hardware" | "quality_incidents" | "audit_logs" | "documents" | "fleets";

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "vehicles", label: "Autot" },
  { value: "drivers", label: "Kuljettajat" },
  { value: "companies", label: "Autoilijat" },
  { value: "hardware", label: "Laitteet" },
  { value: "quality_incidents", label: "Laatupoikkeamat" },
  { value: "documents", label: "Dokumentit" },
  { value: "fleets", label: "Fleetit" },
  { value: "audit_logs", label: "Muutoslokit" },
];

const columnLabels: Record<string, Record<string, string>> = {
  vehicles: { vehicle_number: "Nro", registration_number: "Rekisteri", brand: "Merkki", model: "Malli", city: "Kaupunki", status: "Tila", created_at: "Luotu" },
  drivers: { driver_number: "Nro", full_name: "Nimi", phone: "Puhelin", email: "Email", city: "Kaupunki", province: "Maakunta", status: "Tila" },
  companies: { name: "Nimi", business_id: "Y-tunnus", contact_person: "Yhteyshenkilö", contact_email: "Email", contact_phone: "Puhelin", contract_status: "Sopimustila" },
  hardware: { serial_number: "Sarjanumero", device_type: "Tyyppi", status: "Tila", sim_number: "SIM", created_at: "Luotu" },
  quality_incidents: { incident_type: "Tyyppi", status: "Tila", incident_date: "Päivä", description: "Kuvaus", source: "Lähde" },
  audit_logs: { table_name: "Taulu", action: "Toiminto", description: "Kuvaus", created_at: "Aika" },
  documents: { file_name: "Tiedosto", status: "Tila", valid_from: "Alkaen", valid_until: "Saakka", created_at: "Luotu" },
  fleets: { name: "Nimi", description: "Kuvaus", created_at: "Luotu" },
};

const chartFields: Record<string, { field: string; label: string }[]> = {
  vehicles: [{ field: "status", label: "Tila" }, { field: "brand", label: "Merkki" }, { field: "city", label: "Kaupunki" }],
  drivers: [{ field: "status", label: "Tila" }, { field: "city", label: "Kaupunki" }, { field: "province", label: "Maakunta" }],
  companies: [{ field: "contract_status", label: "Sopimustila" }],
  hardware: [{ field: "status", label: "Tila" }, { field: "device_type", label: "Tyyppi" }],
  quality_incidents: [{ field: "status", label: "Tila" }, { field: "incident_type", label: "Tyyppi" }],
  audit_logs: [{ field: "action", label: "Toiminto" }, { field: "table_name", label: "Taulu" }],
  documents: [{ field: "status", label: "Tila" }],
  fleets: [],
};

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))",
  "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(280 67% 52%)",
  "hsl(200 80% 50%)", "hsl(340 80% 55%)", "hsl(160 60% 45%)", "hsl(20 80% 55%)",
];

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("vehicles");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartField, setChartField] = useState("");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const chartRef = useRef<HTMLDivElement>(null);

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
        case "documents":
          query = supabase.from("company_documents").select("file_name, status, valid_from, valid_until, created_at").order("created_at", { ascending: false });
          break;
        case "fleets":
          query = supabase.from("fleets").select("name, description, created_at").order("name");
          break;
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vehicleAttributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "vehicles",
  });

  const { data: vehicleAttrLinks = [] } = useQuery({
    queryKey: ["vehicle-attr-links-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attribute_links").select("vehicle_id, attribute_id");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "vehicles" && selectedAttributes.length > 0,
  });

  const { data: driverAttributes = [] } = useQuery({
    queryKey: ["driver-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "drivers",
  });

  const { data: driverAttrLinks = [] } = useQuery({
    queryKey: ["driver-attr-links-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_attribute_links").select("driver_id, attribute_id");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "drivers" && selectedAttributes.length > 0,
  });

  const columns = Object.keys(columnLabels[reportType] || {}).filter(c => c !== "id");
  const labels = columnLabels[reportType] || {};

  const uniqueCities = useMemo(() => {
    if (reportType !== "vehicles" && reportType !== "drivers") return [];
    const cities = new Set(reportData.filter((r: any) => r.city).map((r: any) => r.city));
    return Array.from(cities).sort();
  }, [reportData, reportType]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(reportData.filter((r: any) => r.status).map((r: any) => r.status));
    return Array.from(statuses).sort();
  }, [reportData]);

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

    if (cityFilter) data = data.filter((row: any) => row.city === cityFilter);
    if (statusFilter) data = data.filter((row: any) => row.status === statusFilter);

    if (reportType === "vehicles" && selectedAttributes.length > 0) {
      data = data.filter((row: any) => {
        const vehicleLinks = vehicleAttrLinks.filter((link: any) => link.vehicle_id === row.id);
        return selectedAttributes.every(attrId => vehicleLinks.some((link: any) => link.attribute_id === attrId));
      });
    }

    if (reportType === "drivers" && selectedAttributes.length > 0) {
      data = data.filter((row: any) => {
        const links = driverAttrLinks.filter((link: any) => link.driver_id === row.id);
        return selectedAttributes.every(attrId => links.some((link: any) => link.attribute_id === attrId));
      });
    }

    return data;
  }, [reportData, searchQuery, dateFrom, dateTo, cityFilter, statusFilter, selectedAttributes, vehicleAttrLinks, driverAttrLinks, reportType]);

  const { currentPage, setCurrentPage, totalPages, paginatedData, startIndex, endIndex, totalItems } = usePagination(filteredData, { pageSize: 10 });

  const chartData = useMemo(() => {
    if (!chartField) return [];
    const counts: Record<string, number> = {};
    filteredData.forEach((row: any) => {
      const val = row[chartField] || "Tyhjä";
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData, chartField]);

  const exportCSV = () => {
    if (filteredData.length === 0) { toast.error("Ei dataa vietäväksi"); return; }
    const header = columns.map((c) => labels[c]).join(";");
    const rows = filteredData.map((row: any) =>
      columns.map((c) => {
        const val = row[c];
        if (val === null || val === undefined) return "";
        if (c.includes("_at") || c === "incident_date" || c === "valid_from" || c === "valid_until") {
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

  const exportChartImage = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) { toast.error("Kaaviota ei löytynyt"); return; }
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx!.fillStyle = "white";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.scale(2, 2);
      ctx!.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kaavio_${reportType}_${chartField}_${format(new Date(), "yyyy-MM-dd")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Kaavio ladattu");
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [reportType, chartField]);

  const resetFilters = () => {
    setSearchQuery(""); setDateFrom(""); setDateTo(""); setCityFilter(""); setStatusFilter(""); setSelectedAttributes([]);
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || cityFilter || statusFilter || selectedAttributes.length > 0;
  const availableChartFields = chartFields[reportType] || [];
  const currentAttributes = reportType === "vehicles" ? vehicleAttributes : reportType === "drivers" ? driverAttributes : [];

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
            <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); resetFilters(); setChartField(""); }}>
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
                {uniqueCities.length > 0 && (
                  <div className="space-y-1">
                    <Label>Kaupunki</Label>
                    <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        {uniqueCities.map((c) => <SelectItem key={String(c)} value={String(c)}>{String(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {uniqueStatuses.length > 0 && (
                  <div className="space-y-1">
                    <Label>Tila</Label>
                    <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        {uniqueStatuses.map((s) => <SelectItem key={String(s)} value={String(s)}>{String(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {currentAttributes.length > 0 && (
                <div>
                  <Label className="mb-2 block">Suodata attribuuteilla</Label>
                  <div className="flex flex-wrap gap-3">
                    {currentAttributes.map((attr: any) => (
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

        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table" className="gap-2"><FileSpreadsheet className="h-4 w-4" />Taulukko</TabsTrigger>
            <TabsTrigger value="charts" className="gap-2"><BarChart3 className="h-4 w-4" />Kaaviot</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
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
                                  {col.includes("_at") || col === "incident_date" || col === "valid_from" || col === "valid_until"
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
          </TabsContent>

          <TabsContent value="charts">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Kaavio
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={chartField || "none"} onValueChange={(v) => setChartField(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Valitse kenttä" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Valitse kenttä</SelectItem>
                        {availableChartFields.map((f) => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex border rounded-md">
                      <Button variant={chartType === "bar" ? "default" : "ghost"} size="sm" onClick={() => setChartType("bar")} className="rounded-r-none">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button variant={chartType === "pie" ? "default" : "ghost"} size="sm" onClick={() => setChartType("pie")} className="rounded-l-none">
                        <PieChart className="h-4 w-4" />
                      </Button>
                    </div>
                    {chartField && chartData.length > 0 && (
                      <Button variant="outline" size="sm" onClick={exportChartImage} className="gap-1">
                        <Image className="h-4 w-4" />Lataa kuva
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!chartField ? (
                  <p className="text-center py-12 text-muted-foreground">Valitse kenttä nähdäksesi kaavion</p>
                ) : chartData.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Ei dataa kaavioon</p>
                ) : (
                  <div ref={chartRef} className="w-full" style={{ height: 400 }}>
                    {chartType === "bar" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Bar dataKey="value" name="Määrä" radius={[4, 4, 0, 0]}>
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={chartData} cx="50%" cy="50%" labelLine={true}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={140} dataKey="value">
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
