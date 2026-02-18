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
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

type ReportType = "vehicles" | "drivers" | "companies" | "hardware" | "quality_incidents" | "documents";

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "vehicles", label: "Autot" },
  { value: "drivers", label: "Kuljettajat" },
  { value: "companies", label: "Autoilijat" },
  { value: "hardware", label: "Laitteet" },
  { value: "quality_incidents", label: "Laatupoikkeamat" },
  { value: "documents", label: "Dokumentit" },
];

// Translation maps for technical values
const statusTranslations: Record<string, string> = {
  active: "Aktiivinen", removed: "Poistettu", inactive: "Ei-aktiivinen", suspended: "Estetty",
  available: "Vapaana", installed: "Asennettu", maintenance: "Huollossa", decommissioned: "Poistettu käytöstä",
  expired: "Vanhentunut", pending: "Odottaa", terminated: "Päättynyt",
  new: "Uusi", investigating: "Tutkinnassa", resolved: "Ratkaistu", closed: "Suljettu",
};

const fuelTypeTranslations: Record<string, string> = {
  bensiini: "Bensiini", diesel: "Diesel", "sähkö": "Sähkö", hybridi: "Hybridi", kaasu: "Kaasu",
};

const incidentTypeTranslations: Record<string, string> = {
  customer_complaint: "Asiakasvalitus", service_quality: "Palvelun laatu",
  vehicle_condition: "Ajoneuvon kunto", driver_behavior: "Kuljettajan käytös",
  safety_issue: "Turvallisuus", billing_issue: "Laskutus", other: "Muu",
};

const translateValue = (col: string, val: any, deviceTypeMap?: Map<string, string>): string => {
  if (val === null || val === undefined) return "—";
  if (col === "status" || col === "contract_status") return statusTranslations[val] || val;
  if (col === "incident_type") return incidentTypeTranslations[val] || val;
  if (col === "device_type" && deviceTypeMap) return deviceTypeMap.get(val) || val;
  if (col === "fuel_type") return fuelTypeTranslations[val] || val;
  return String(val);
};

const columnLabels: Record<string, Record<string, string>> = {
  vehicles: { vehicle_number: "Nro", registration_number: "Rekisteri", brand: "Merkki", model: "Malli", year_model: "Vuosimalli", fuel_type: "Käyttövoima", co2_emissions: "CO₂ (g/km)", city: "Kaupunki", status: "Tila", created_at: "Luotu" },
  drivers: { driver_number: "Nro", full_name: "Nimi", phone: "Puhelin", email: "Email", city: "Kunta", province: "Maakunta", status: "Tila" },
  companies: { name: "Nimi", business_id: "Y-tunnus", contact_person: "Yhteyshenkilö", contact_email: "Email", contact_phone: "Puhelin", contract_status: "Sopimustila" },
  hardware: { serial_number: "Sarjanumero", device_type: "Tyyppi", status: "Tila", sim_number: "SIM", created_at: "Luotu" },
  quality_incidents: { incident_date: "Päivä", incident_type: "Tyyppi", vehicle_reg: "Ajoneuvo", driver_name: "Kuljettaja", description: "Kuvaus", action_taken: "Toimenpiteet", status: "Tila", handler: "Käsittelijä", company_name: "Yritys" },
  documents: { file_name: "Tiedosto", status: "Tila", valid_from: "Alkaen", valid_until: "Saakka", created_at: "Luotu" },
};

const chartFields: Record<string, { field: string; label: string }[]> = {
  vehicles: [{ field: "status", label: "Tila" }, { field: "brand", label: "Merkki" }, { field: "city", label: "Kaupunki" }, { field: "fuel_type", label: "Käyttövoima" }, { field: "year_model", label: "Vuosimalli" }],
  drivers: [{ field: "status", label: "Tila" }, { field: "city", label: "Kunta" }, { field: "province", label: "Maakunta" }],
  companies: [{ field: "contract_status", label: "Sopimustila" }],
  hardware: [{ field: "status", label: "Tila" }, { field: "device_type", label: "Tyyppi" }],
  quality_incidents: [{ field: "status", label: "Tila" }, { field: "incident_type", label: "Tyyppi" }],
  documents: [{ field: "status", label: "Tila" }],
};

// Company attributes for reports
const companyAttributeFields = true;

const DEFAULT_CHART_COLORS = [
  "#FFDC29", "#E5C624", "#CCB01F", "#B39A1A",
  "#FFE45C", "#FFD700", "#DAA520", "#B8860B",
  "#FFC107", "#FF9800",
];

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("vehicles");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [fuelFilter, setFuelFilter] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [co2Min, setCo2Min] = useState("");
  const [co2Max, setCo2Max] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartField, setChartField] = useState("");
  const [pieCombineEnabled, setPieCombineEnabled] = useState(true);
  const [pieCombineThreshold, setPieCombineThreshold] = useState("5");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [chartColors, setChartColors] = useState<string[]>([...DEFAULT_CHART_COLORS]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch municipalities for driver/vehicle city filter
  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("name, province").order("name");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "drivers" || reportType === "vehicles",
  });

  // Fetch device types for hardware display names
  const { data: deviceTypes = [] } = useQuery({
    queryKey: ["device-types-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_types").select("name, display_name").order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: reportType === "hardware",
  });

  // Company attributes for reports
  const { data: companyAttributes = [] } = useQuery({
    queryKey: ["company-attributes-report"],
    queryFn: async () => { const { data, error } = await supabase.from("company_attributes").select("id, name").order("name"); if (error) throw error; return data; },
    enabled: reportType === "companies",
  });
  const { data: companyAttrLinks = [] } = useQuery({
    queryKey: ["company-attr-links-report"],
    queryFn: async () => { const { data, error } = await supabase.from("company_attribute_links").select("company_id, attribute_id"); if (error) throw error; return data; },
    enabled: reportType === "companies",
  });

  const deviceTypeMap = new Map(deviceTypes.map((dt: any) => [dt.name, dt.display_name]));

  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ["report", reportType],
    queryFn: async () => {
      let query: any;
      switch (reportType) {
        case "vehicles":
          query = supabase.from("vehicles").select("vehicle_number, registration_number, brand, model, year_model, fuel_type, co2_emissions, city, status, created_at, id").order("vehicle_number");
          break;
        case "drivers":
          query = supabase.from("drivers").select("driver_number, full_name, phone, email, city, province, status, id").order("full_name");
          break;
        case "companies":
          query = supabase.from("companies").select("id, name, business_id, contact_person, contact_email, contact_phone, contract_status").order("name");
          break;
        case "hardware":
          query = supabase.from("hardware_devices").select("serial_number, device_type, status, sim_number, created_at").order("serial_number");
          break;
        case "quality_incidents": {
          const { data: raw, error } = await supabase
            .from("quality_incidents")
            .select("incident_type, status, incident_date, description, action_taken, source, created_by, updated_by, vehicle_id, driver_id")
            .order("incident_date", { ascending: false });
          if (error) throw error;
          // Enrich with vehicle/driver/handler/company names
          const enriched = await Promise.all((raw || []).map(async (r: any) => {
            let vehicle_reg = "—", driver_name = "—", handler = "—", company_name = "—";
            if (r.vehicle_id) {
              const { data: v } = await supabase.from("vehicles").select("registration_number, company_id").eq("id", r.vehicle_id).single();
              if (v) {
                vehicle_reg = v.registration_number;
                if (v.company_id) {
                  const { data: c } = await supabase.from("companies").select("name").eq("id", v.company_id).single();
                  if (c) company_name = c.name;
                }
              }
            }
            if (r.driver_id) {
              const { data: d } = await supabase.from("drivers").select("full_name").eq("id", r.driver_id).single();
              if (d) driver_name = d.full_name || "—";
            }
            const handlerId = r.updated_by || r.created_by;
            if (handlerId) {
              const { data: p } = await supabase.from("profiles").select("full_name").eq("id", handlerId).single();
              if (p) handler = p.full_name || "—";
            }
            return { ...r, vehicle_reg, driver_name, handler, company_name };
          }));
          return enriched;
        }
        case "documents":
          query = supabase.from("company_documents").select("file_name, status, valid_from, valid_until, created_at").order("created_at", { ascending: false });
          break;
      }
      if (query) {
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
      return [];
    },
  });

  const { data: vehicleAttributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"], queryFn: async () => { const { data, error } = await supabase.from("vehicle_attributes").select("id, name").order("name"); if (error) throw error; return data; }, enabled: reportType === "vehicles",
  });
  const { data: vehicleAttrLinks = [] } = useQuery({
    queryKey: ["vehicle-attr-links-report"], queryFn: async () => { const { data, error } = await supabase.from("vehicle_attribute_links").select("vehicle_id, attribute_id"); if (error) throw error; return data; }, enabled: reportType === "vehicles",
  });
  const { data: driverAttributes = [] } = useQuery({
    queryKey: ["driver-attributes"], queryFn: async () => { const { data, error } = await supabase.from("driver_attributes").select("id, name").order("name"); if (error) throw error; return data; }, enabled: reportType === "drivers",
  });
  const { data: driverAttrLinks = [] } = useQuery({
    queryKey: ["driver-attr-links-report"], queryFn: async () => { const { data, error } = await supabase.from("driver_attribute_links").select("driver_id, attribute_id"); if (error) throw error; return data; }, enabled: reportType === "drivers",
  });

  const columns = Object.keys(columnLabels[reportType] || {}).filter(c => c !== "id");
  const labels = columnLabels[reportType] || {};

  const uniqueCities = useMemo(() => {
    if (reportType === "vehicles") {
      const cities = [...new Set((reportData || []).map((r: any) => r.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fi"));
      return cities;
    }
    if (reportType === "drivers") return municipalities.map((m: any) => m.name);
    return [];
  }, [reportType, municipalities, reportData]);

  const uniqueFuelTypes = useMemo(() => {
    if (reportType !== "vehicles") return [];
    const types = new Set(reportData.filter((r: any) => r.fuel_type).map((r: any) => r.fuel_type));
    return Array.from(types).sort() as string[];
  }, [reportData, reportType]);

  const uniqueStatuses = useMemo(() => {
    const field = reportType === "companies" ? "contract_status" : "status";
    const statuses = new Set(reportData.filter((r: any) => r[field]).map((r: any) => r[field]));
    return Array.from(statuses).sort();
  }, [reportData, reportType]);

  const uniqueTypes = useMemo(() => {
    if (reportType === "quality_incidents") {
      const types = new Set(reportData.filter((r: any) => r.incident_type).map((r: any) => r.incident_type));
      return Array.from(types).sort();
    }
    if (reportType === "hardware") {
      const types = new Set(reportData.filter((r: any) => r.device_type).map((r: any) => r.device_type));
      return Array.from(types).sort();
    }
    return [];
  }, [reportData, reportType]);

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
    if (cityFilters.length > 0) {
      data = data.filter((row: any) => {
        const city = row.city || "";
        return cityFilters.some(f => city.toLowerCase().includes(f.toLowerCase()));
      });
    }
    const statusField = reportType === "companies" ? "contract_status" : "status";
    if (statusFilter) data = data.filter((row: any) => row[statusField] === statusFilter);
    if (typeFilter && reportType === "quality_incidents") data = data.filter((row: any) => row.incident_type === typeFilter);
    if (typeFilter && reportType === "hardware") data = data.filter((row: any) => row.device_type === typeFilter);
    if (reportType === "vehicles") {
      if (fuelFilter) data = data.filter((row: any) => row.fuel_type === fuelFilter);
      if (yearMin) data = data.filter((row: any) => row.year_model && row.year_model >= parseInt(yearMin));
      if (yearMax) data = data.filter((row: any) => row.year_model && row.year_model <= parseInt(yearMax));
      if (co2Min) data = data.filter((row: any) => row.co2_emissions != null && row.co2_emissions >= parseFloat(co2Min));
      if (co2Max) data = data.filter((row: any) => row.co2_emissions != null && row.co2_emissions <= parseFloat(co2Max));
    }
    if (reportType === "vehicles" && selectedAttributes.length > 0) {
      data = data.filter((row: any) => {
        const vLinks = vehicleAttrLinks.filter((l: any) => l.vehicle_id === row.id);
        return selectedAttributes.every(a => vLinks.some((l: any) => l.attribute_id === a));
      });
    }
    if (reportType === "drivers" && selectedAttributes.length > 0) {
      data = data.filter((row: any) => {
        const links = driverAttrLinks.filter((l: any) => l.driver_id === row.id);
        return selectedAttributes.every(a => links.some((l: any) => l.attribute_id === a));
      });
    }

    if (reportType === "companies" && selectedAttributes.length > 0) {
      data = data.filter((row: any) => {
        const links = companyAttrLinks.filter((l: any) => l.company_id === row.id);
        return selectedAttributes.every(a => links.some((l: any) => l.attribute_id === a));
      });
    }

    if (reportType === "vehicles") {
      data = [...data].sort((a: any, b: any) => (parseInt(a.vehicle_number, 10) || 0) - (parseInt(b.vehicle_number, 10) || 0));
    } else if (reportType === "drivers") {
      data = [...data].sort((a: any, b: any) => (parseInt(a.driver_number, 10) || 0) - (parseInt(b.driver_number, 10) || 0));
    }
    return data;
  }, [reportData, searchQuery, dateFrom, dateTo, cityFilters, statusFilter, typeFilter, fuelFilter, yearMin, yearMax, co2Min, co2Max, selectedAttributes, vehicleAttrLinks, driverAttrLinks, reportType]);

  const { currentPage, setCurrentPage, totalPages, paginatedData, startIndex, endIndex, totalItems } = usePagination(filteredData, { pageSize: 10 });

  const chartData = useMemo(() => {
    if (!chartField) return [];
    const counts: Record<string, number> = {};

    // Handle attribute-based chart fields
    if (chartField.startsWith("attr_")) {
      const attrId = chartField.replace("attr_", "");
      const allAttrs = reportType === "vehicles" ? vehicleAttributes : reportType === "drivers" ? driverAttributes : companyAttributes;
      const attrName = allAttrs.find((a: any) => a.id === attrId)?.name || "?";
      const allLinks = reportType === "vehicles" ? vehicleAttrLinks : reportType === "drivers" ? driverAttrLinks : companyAttrLinks;
      const idField = reportType === "vehicles" ? "vehicle_id" : reportType === "drivers" ? "driver_id" : "company_id";

      let hasCount = 0;
      let notCount = 0;
      filteredData.forEach((row: any) => {
        const has = allLinks.some((l: any) => l[idField] === row.id && l.attribute_id === attrId);
        if (has) hasCount++;
        else notCount++;
      });
      const sorted = [
        { name: attrName, value: hasCount },
        { name: `Ei: ${attrName}`, value: notCount },
      ].filter(item => item.value > 0);
      return sorted;
    }

    filteredData.forEach((row: any) => {
      let val = row[chartField] || "Tyhjä";
      val = translateValue(chartField, val, deviceTypeMap);
      counts[val] = (counts[val] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // For pie charts, optionally combine small slices
    if (chartType === "pie" && pieCombineEnabled) {
      const total = sorted.reduce((sum, item) => sum + item.value, 0);
      const pct = parseFloat(pieCombineThreshold) || 5;
      const threshold = total * (pct / 100);
      const major = sorted.filter(item => item.value >= threshold);
      const minorSum = sorted.filter(item => item.value < threshold).reduce((sum, item) => sum + item.value, 0);
      if (minorSum > 0) major.push({ name: "Muut", value: minorSum });
      return major;
    }
    return sorted;
  }, [filteredData, chartField, chartType, pieCombineEnabled, pieCombineThreshold, deviceTypeMap, reportType, vehicleAttributes, driverAttributes, companyAttributes, vehicleAttrLinks, driverAttrLinks, companyAttrLinks]);

  const exportCSV = async () => {
    if (filteredData.length === 0) { toast.error("Ei dataa vietäväksi"); return; }
    const header = columns.map((c) => labels[c]).join(";");
    const rows = filteredData.map((row: any) =>
      columns.map((c) => {
        const val = row[c];
        if (val === null || val === undefined) return "";
        if (c.includes("_at") || c === "incident_date" || c === "valid_from" || c === "valid_until") {
          try { return format(new Date(val), "d.M.yyyy HH:mm", { locale: fi }); } catch { return val; }
        }
        return translateValue(c, val, deviceTypeMap).replace(/;/g, ",");
      }).join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `raportti_${reportType}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Raportti viety (${filteredData.length} riviä)`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id, action: "export", table_name: reportType, record_id: "report-export",
          description: `Raportti viety: ${reportTypes.find(r => r.value === reportType)?.label || reportType} (${filteredData.length} riviä)`,
          new_data: { report_type: reportType, row_count: filteredData.length, filters: { searchQuery, dateFrom, dateTo, cityFilters, statusFilter } },
        });
      }
    } catch (e) { /* silent */ }
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
      canvas.width = img.width * 2; canvas.height = img.height * 2;
      ctx!.fillStyle = "white"; ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.scale(2, 2); ctx!.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `kaavio_${reportType}_${chartField}_${format(new Date(), "yyyy-MM-dd")}.png`;
        a.click(); URL.revokeObjectURL(url); toast.success("Kaavio ladattu");
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [reportType, chartField]);

  const resetFilters = () => {
    setSearchQuery(""); setDateFrom(""); setDateTo(""); setCityFilters([]); setStatusFilter(""); setTypeFilter(""); setSelectedAttributes([]);
    setFuelFilter(""); setYearMin(""); setYearMax(""); setCo2Min(""); setCo2Max("");
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || cityFilters.length > 0 || statusFilter || typeFilter || selectedAttributes.length > 0 || fuelFilter || yearMin || yearMax || co2Min || co2Max;
  const availableChartFields = useMemo(() => {
    return chartFields[reportType] || [];
  }, [reportType]);
  const currentAttributes = reportType === "vehicles" ? vehicleAttributes : reportType === "drivers" ? driverAttributes : reportType === "companies" ? companyAttributes : [];

  const [citySearch, setCitySearch] = useState("");
  const toggleCityFilter = (city: string) => {
    setCityFilters(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  return (
    <ProtectedPage pageKey="raportit">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>Alkaen</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Saakka</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                {uniqueCities.length > 0 && (
                  <div className="space-y-1">
                    <Label>{reportType === "drivers" ? "Kunta" : "Kaupunki"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {cityFilters.length > 0 ? `${cityFilters.length} valittu` : "Valitse..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 p-2 max-h-72 overflow-hidden flex flex-col">
                        <div className="mb-2">
                          <Input placeholder="Hae..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="overflow-y-auto max-h-48 space-y-0.5">
                          {uniqueCities.filter(c => !citySearch || String(c).toLowerCase().includes(citySearch.toLowerCase())).map((c) => (
                            <div key={String(c)} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer" onClick={() => toggleCityFilter(String(c))}>
                              <Checkbox checked={cityFilters.includes(String(c))} onCheckedChange={() => {}} />
                              <span className="text-sm">{String(c)}</span>
                            </div>
                          ))}
                          {uniqueCities.filter(c => !citySearch || String(c).toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">Ei tuloksia</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {cityFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cityFilters.map(c => (
                          <Badge key={c} variant="secondary" className="gap-1 text-xs">
                            {c}
                            <button onClick={() => toggleCityFilter(c)} className="ml-1 hover:text-destructive">×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {reportType === "vehicles" && (
                  <>
                    <div className="space-y-1">
                      <Label>Käyttövoima</Label>
                      <Select value={fuelFilter || "all"} onValueChange={(v) => setFuelFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Kaikki</SelectItem>
                          {uniqueFuelTypes.map((f) => <SelectItem key={f} value={f}>{fuelTypeTranslations[f] || f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Vuosimalli (min–max)</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Min" value={yearMin} onChange={(e) => setYearMin(e.target.value)} className="h-9" />
                        <Input type="number" placeholder="Max" value={yearMax} onChange={(e) => setYearMax(e.target.value)} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>CO₂ g/km (min–max)</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Min" value={co2Min} onChange={(e) => setCo2Min(e.target.value)} className="h-9" />
                        <Input type="number" placeholder="Max" value={co2Max} onChange={(e) => setCo2Max(e.target.value)} className="h-9" />
                      </div>
                    </div>
                  </>
                )}
                {uniqueStatuses.length > 0 && (
                  <div className="space-y-1">
                    <Label>Tila</Label>
                    <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        {uniqueStatuses.map((s) => <SelectItem key={String(s)} value={String(s)}>{statusTranslations[String(s)] || String(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(reportType === "quality_incidents" || reportType === "hardware") && uniqueTypes.length > 0 && (
                  <div className="space-y-1">
                    <Label>Tyyppi</Label>
                    <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Kaikki</SelectItem>
                        {uniqueTypes.map((t) => (
                          <SelectItem key={String(t)} value={String(t)}>
                            {reportType === "hardware" ? (deviceTypeMap.get(String(t)) || String(t)) : (incidentTypeTranslations[String(t)] || String(t))}
                          </SelectItem>
                        ))}
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
                        <Checkbox id={`report-attr-${attr.id}`} checked={selectedAttributes.includes(attr.id)} onCheckedChange={(checked) => setSelectedAttributes((prev) => checked ? [...prev, attr.id] : prev.filter((id) => id !== attr.id))} />
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
                                    : translateValue(col, row[col], deviceTypeMap)}
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
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Kaavio</CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={chartField || "none"} onValueChange={(v) => setChartField(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Valitse kenttä" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Valitse kenttä</SelectItem>
                        {availableChartFields.map((f) => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex border rounded-md">
                      <Button variant={chartType === "bar" ? "default" : "ghost"} size="sm" onClick={() => setChartType("bar")} className="rounded-r-none"><BarChart3 className="h-4 w-4" /></Button>
                      <Button variant={chartType === "pie" ? "default" : "ghost"} size="sm" onClick={() => setChartType("pie")} className="rounded-l-none"><PieChart className="h-4 w-4" /></Button>
                    </div>
                    {chartType === "pie" && (
                      <div className="flex items-center gap-2">
                        <Checkbox id="pie-combine" checked={pieCombineEnabled} onCheckedChange={(v) => setPieCombineEnabled(!!v)} />
                        <label htmlFor="pie-combine" className="text-sm cursor-pointer whitespace-nowrap">Yhdistä alle</label>
                        <Input type="number" value={pieCombineThreshold} onChange={(e) => setPieCombineThreshold(e.target.value)} className="w-16 h-8 text-sm" min="1" max="50" disabled={!pieCombineEnabled} />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    )}
                    {chartField && chartData.length > 0 && (
                      <Button variant="outline" size="sm" onClick={exportChartImage} className="gap-1"><Image className="h-4 w-4" />Lataa kuva</Button>
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
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {chartData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <input type="color" value={chartColors[index % chartColors.length]} onChange={(e) => { const c = [...chartColors]; c[index] = e.target.value; setChartColors(c); }} className="w-6 h-6 rounded cursor-pointer border-0" />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div ref={chartRef} className="w-full" style={{ height: 400 }}>
                      {chartType === "bar" ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                            <Bar dataKey="value" name="Määrä" radius={[4, 4, 0, 0]}>
                              {chartData.map((_, index) => (<Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie data={chartData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={140} dataKey="value">
                              {chartData.map((_, index) => (<Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                            <Legend />
                          </RechartsPie>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ProtectedPage>
  );
}

// Need these imports for the Popover used in city filter
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
