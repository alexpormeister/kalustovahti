import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CompanySearchSelect } from "@/components/shared/CompanySearchSelect";
import { 
  Plus, Search, Filter, ClipboardCheck, CalendarIcon,
  Check, ChevronsUpDown, Pencil, X
} from "lucide-react";
import { useCanEdit } from "@/components/auth/ProtectedPage";
import { toast } from "sonner";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { cn } from "@/lib/utils";

type IncidentType = 
  | "customer_complaint" | "service_quality" | "vehicle_condition"
  | "driver_behavior" | "safety_issue" | "billing_issue" | "other";

type IncidentStatus = "new" | "investigating" | "resolved" | "closed";

interface QualityIncident {
  id: string;
  incident_date: string;
  vehicle_id: string | null;
  driver_id: string | null;
  incident_type: IncidentType;
  source: string | null;
  description: string;
  action_taken: string | null;
  status: IncidentStatus;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: { registration_number: string; vehicle_number: string; company_id: string | null } | null;
  driver?: { full_name: string | null; driver_number: string | null } | null;
  creator?: { full_name: string | null } | null;
  updater?: { full_name: string | null } | null;
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

export default function QualityControl() {
  const queryClient = useQueryClient();
  const canEdit = useCanEdit("laadunvalvonta");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [handlerFilter, setHandlerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<QualityIncident | null>(null);
  
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    incident_date: new Date(),
    vehicle_id: "",
    driver_id: "",
    company_id: "",
    incident_type: "customer_complaint" as IncidentType,
    source: "",
    description: "",
    action_taken: "",
    status: "new" as IncidentStatus,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["quality-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_incidents")
        .select(`*, vehicle:vehicles(registration_number, vehicle_number, company_id)`)
        .order("incident_date", { ascending: false });
      if (error) throw error;
      
      const incidentsWithDetails = await Promise.all(
        (data || []).map(async (incident: any) => {
          let driver = null, creator = null, updater = null;
          if (incident.driver_id) {
            const { data: d } = await supabase.from("drivers").select("full_name, driver_number").eq("id", incident.driver_id).single();
            driver = d;
          }
          if (incident.created_by) {
            const { data: c } = await supabase.from("profiles").select("full_name").eq("id", incident.created_by).single();
            creator = c;
          }
          if (incident.updated_by) {
            const { data: u } = await supabase.from("profiles").select("full_name").eq("id", incident.updated_by).single();
            updater = u;
          }
          return { ...incident, driver, creator, updater };
        })
      );
      return incidentsWithDetails as QualityIncident[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, registration_number, vehicle_number, company_id").order("vehicle_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: driversData = [] } = useQuery({
    queryKey: ["drivers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("id, full_name, driver_number, company_id").eq("status", "active").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, business_id").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("quality_incidents").insert([{
        incident_date: format(data.incident_date, "yyyy-MM-dd"),
        vehicle_id: data.vehicle_id || null,
        driver_id: data.driver_id || null,
        incident_type: data.incident_type,
        source: data.source || null,
        description: data.description,
        action_taken: data.action_taken || null,
        status: data.status,
        created_by: currentUser?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-incidents"] });
      toast.success("Tapaus lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error("Virhe: " + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("quality_incidents").update({
        incident_date: format(data.incident_date, "yyyy-MM-dd"),
        vehicle_id: data.vehicle_id || null,
        driver_id: data.driver_id || null,
        incident_type: data.incident_type,
        source: data.source || null,
        description: data.description,
        action_taken: data.action_taken || null,
        status: data.status,
        updated_by: currentUser?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-incidents"] });
      toast.success("Tapaus päivitetty");
      setSelectedIncident(null);
      resetForm();
    },
    onError: (error: any) => toast.error("Virhe: " + error.message),
  });

  const resetForm = () => {
    setFormData({
      incident_date: new Date(), vehicle_id: "", driver_id: "", company_id: "",
      incident_type: "customer_complaint", source: "", description: "", action_taken: "", status: "new",
    });
  };

  const handleEdit = (incident: QualityIncident) => {
    setSelectedIncident(incident);
    setFormData({
      incident_date: new Date(incident.incident_date),
      vehicle_id: incident.vehicle_id || "",
      driver_id: incident.driver_id || "",
      company_id: incident.vehicle?.company_id || "",
      incident_type: incident.incident_type,
      source: incident.source || "",
      description: incident.description,
      action_taken: incident.action_taken || "",
      status: incident.status,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncident) {
      updateMutation.mutate({ id: selectedIncident.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter vehicles/drivers by selected company
  const filteredVehiclesForForm = formData.company_id
    ? vehicles.filter(v => v.company_id === formData.company_id)
    : vehicles;

  const filteredDriversForForm = driversData;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        incident.description.toLowerCase().includes(query) ||
        incident.source?.toLowerCase().includes(query) ||
        incident.action_taken?.toLowerCase().includes(query) ||
        incident.vehicle?.registration_number.toLowerCase().includes(query) ||
        incident.driver?.full_name?.toLowerCase().includes(query) ||
        incident.creator?.full_name?.toLowerCase().includes(query) ||
        incident.updater?.full_name?.toLowerCase().includes(query) ||
        incidentTypeLabels[incident.incident_type]?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
      const matchesType = typeFilter === "all" || incident.incident_type === typeFilter;
      
      const matchesDate = (() => {
        if (!dateFrom && !dateTo) return true;
        const d = new Date(incident.incident_date);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })();

      const matchesHandler = !handlerFilter ||
        incident.creator?.full_name?.toLowerCase().includes(handlerFilter.toLowerCase()) ||
        incident.updater?.full_name?.toLowerCase().includes(handlerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesType && matchesDate && matchesHandler;
    });
  }, [incidents, searchQuery, statusFilter, typeFilter, dateFrom, dateTo, handlerFilter]);

  // Inline form JSX (not a component - prevents textarea re-mount bug)
  const incidentFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Päivämäärä *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.incident_date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.incident_date ? format(formData.incident_date, "d.M.yyyy", { locale: fi }) : "Valitse päivämäärä"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={formData.incident_date} onSelect={(date) => setFormData({ ...formData, incident_date: date || new Date() })} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Tyyppi *</Label>
          <Select value={formData.incident_type} onValueChange={(value: IncidentType) => setFormData({ ...formData, incident_type: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(incidentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Company search */}
      <div className="space-y-2">
        <Label>Yritys / Autoilija</Label>
        <CompanySearchSelect
          value={formData.company_id}
          onChange={(value) => setFormData({ ...formData, company_id: value, vehicle_id: "", driver_id: "" })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ajoneuvo</Label>
          <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {formData.vehicle_id ? filteredVehiclesForForm.find((v) => v.id === formData.vehicle_id)?.registration_number : "Valitse ajoneuvo..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Hae ajoneuvoa..." />
                <CommandList>
                  <CommandEmpty>Ei ajoneuvoja.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="" onSelect={() => { setFormData({ ...formData, vehicle_id: "" }); setVehicleOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.vehicle_id ? "opacity-100" : "opacity-0")} />
                      Ei ajoneuvoa
                    </CommandItem>
                    {filteredVehiclesForForm.map((vehicle) => (
                      <CommandItem key={vehicle.id} value={`${vehicle.registration_number} ${vehicle.vehicle_number}`} onSelect={() => { setFormData({ ...formData, vehicle_id: vehicle.id }); setVehicleOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", formData.vehicle_id === vehicle.id ? "opacity-100" : "opacity-0")} />
                        {vehicle.registration_number} ({vehicle.vehicle_number})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Kuljettaja</Label>
          <Popover open={driverOpen} onOpenChange={setDriverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {formData.driver_id ? filteredDriversForForm.find((d: any) => d.id === formData.driver_id)?.full_name : "Valitse kuljettaja..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Hae kuljettajaa..." />
                <CommandList>
                  <CommandEmpty>Ei kuljettajia.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="" onSelect={() => { setFormData({ ...formData, driver_id: "" }); setDriverOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.driver_id ? "opacity-100" : "opacity-0")} />
                      Ei kuljettajaa
                    </CommandItem>
                    {filteredDriversForForm.map((driver: any) => (
                      <CommandItem key={driver.id} value={`${driver.full_name} ${driver.driver_number}`} onSelect={() => { setFormData({ ...formData, driver_id: driver.id }); setDriverOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", formData.driver_id === driver.id ? "opacity-100" : "opacity-0")} />
                        {driver.full_name} ({driver.driver_number})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Lähde</Label>
          <Input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="Esim. Asiakaspalaute, Välityskeskus" />
        </div>
        <div className="space-y-2">
          <Label>Tila</Label>
          <Select value={formData.status} onValueChange={(value: IncidentStatus) => setFormData({ ...formData, status: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Kuvaus *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Kuvaa tapaus..."
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Toimenpiteet</Label>
        <Textarea
          value={formData.action_taken}
          onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
          placeholder="Mitä toimenpiteitä on tehty..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedIncident(null); resetForm(); }}>
          Peruuta
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? "Tallennetaan..." : "Tallenna"}
        </Button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Laadunvalvonta</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Hallitse laatutapauksia ja asiakaspalautteita</p>
          </div>
          {canEdit && <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />Lisää tapaus</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Lisää uusi laatutapaus</DialogTitle></DialogHeader>
              {incidentFormJSX}
            </DialogContent>
          </Dialog>}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hae kuvauksella, toimenpiteillä, lähteellä..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />Suodattimet
          </Button>
        </div>

        {showFilters && (
          <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <Label>Tyyppi</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki tyypit</SelectItem>
                    {Object.entries(incidentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tila</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki tilat</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Alkaen</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label>Saakka</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label>Käsittelijä</Label>
                <Input placeholder="Hae käsittelijällä..." value={handlerFilter} onChange={(e) => setHandlerFilter(e.target.value)} className="w-48" />
              </div>
            </div>
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo || handlerFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); setDateFrom(""); setDateTo(""); setHandlerFilter(""); }} className="gap-1">
                <X className="h-4 w-4" />Tyhjennä suodattimet
              </Button>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!selectedIncident} onOpenChange={(open) => { if (!open) { setSelectedIncident(null); resetForm(); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Muokkaa tapausta</DialogTitle></DialogHeader>
            {incidentFormJSX}
          </DialogContent>
        </Dialog>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Ei laatutapauksia</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div key={incident.id} className="glass-card rounded-lg p-4 space-y-3" onClick={() => canEdit && handleEdit(incident)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{incidentTypeLabels[incident.incident_type]}</Badge>
                      <Badge variant="outline" className={cn("text-xs border", statusColors[incident.status])}>{statusLabels[incident.status]}</Badge>
                    </div>
                    <p className="text-sm font-medium">{format(new Date(incident.incident_date), "d.M.yyyy", { locale: fi })}</p>
                  </div>
                  {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Pencil className="h-4 w-4" /></Button>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                {incident.action_taken && <p className="text-xs text-muted-foreground">Toimenpiteet: {incident.action_taken}</p>}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {incident.vehicle && <span>Auto: {incident.vehicle.registration_number}</span>}
                  {incident.driver?.full_name && <span>Kuljettaja: {incident.driver.full_name}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Pvm</TableHead>
                  <TableHead className="font-semibold text-foreground">Tyyppi</TableHead>
                  <TableHead className="font-semibold text-foreground">Ajoneuvo</TableHead>
                  <TableHead className="font-semibold text-foreground">Kuljettaja</TableHead>
                  <TableHead className="font-semibold text-foreground">Kuvaus</TableHead>
                  <TableHead className="font-semibold text-foreground">Toimenpiteet</TableHead>
                  <TableHead className="font-semibold text-foreground">Tila</TableHead>
                  <TableHead className="font-semibold text-foreground">Käsittelijä</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Ladataan...</TableCell></TableRow>
                ) : filteredIncidents.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ei laatutapauksia</p>
                  </TableCell></TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{format(new Date(incident.incident_date), "d.M.yyyy", { locale: fi })}</TableCell>
                      <TableCell><Badge variant="outline">{incidentTypeLabels[incident.incident_type]}</Badge></TableCell>
                      <TableCell>{incident.vehicle ? incident.vehicle.registration_number : "—"}</TableCell>
                      <TableCell>{incident.driver?.full_name || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{incident.description}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">{incident.action_taken || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("border", statusColors[incident.status])}>{statusLabels[incident.status]}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{incident.updater?.full_name || incident.creator?.full_name || "—"}</TableCell>
                      <TableCell>
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(incident)}><Pencil className="h-4 w-4" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
