import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardCheck, 
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
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
  vehicle?: { registration_number: string; vehicle_number: string } | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<QualityIncident | null>(null);
  
  // Combobox states
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    incident_date: new Date(),
    vehicle_id: "",
    driver_id: "",
    incident_type: "customer_complaint" as IncidentType,
    source: "",
    description: "",
    action_taken: "",
    status: "new" as IncidentStatus,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch incidents
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["quality-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_incidents")
        .select(`
          *,
          vehicle:vehicles(registration_number, vehicle_number)
        `)
        .order("incident_date", { ascending: false });
      
      if (error) throw error;
      
      // Fetch driver and creator/updater info separately
      const incidentsWithDetails = await Promise.all(
        (data || []).map(async (incident: any) => {
          let driver = null;
          let creator = null;
          let updater = null;

          if (incident.driver_id) {
            const { data: driverData } = await supabase
              .from("drivers")
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

          if (incident.updated_by) {
            const { data: updaterData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", incident.updated_by)
              .single();
            updater = updaterData;
          }

          return {
            ...incident,
            driver,
            creator,
            updater,
          };
        })
      );

      return incidentsWithDetails as QualityIncident[];
    },
  });

  // Fetch vehicles for dropdown
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, vehicle_number")
        .order("vehicle_number");
      if (error) throw error;
      return data;
    },
  });

  // Fetch drivers for dropdown
  const { data: driversData = [] } = useQuery({
    queryKey: ["drivers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, driver_number")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("quality_incidents")
        .insert([{
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
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("quality_incidents")
        .update({
          incident_date: format(data.incident_date, "yyyy-MM-dd"),
          vehicle_id: data.vehicle_id || null,
          driver_id: data.driver_id || null,
          incident_type: data.incident_type,
          source: data.source || null,
          description: data.description,
          action_taken: data.action_taken || null,
          status: data.status,
          updated_by: currentUser?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-incidents"] });
      toast.success("Tapaus päivitetty");
      setSelectedIncident(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      incident_date: new Date(),
      vehicle_id: "",
      driver_id: "",
      incident_type: "customer_complaint",
      source: "",
      description: "",
      action_taken: "",
      status: "new",
    });
  };

  const handleEdit = (incident: QualityIncident) => {
    setSelectedIncident(incident);
    setFormData({
      incident_date: new Date(incident.incident_date),
      vehicle_id: incident.vehicle_id || "",
      driver_id: incident.driver_id || "",
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

  const filteredIncidents = incidents.filter((incident) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      incident.description.toLowerCase().includes(query) ||
      incident.source?.toLowerCase().includes(query) ||
      incident.vehicle?.registration_number.toLowerCase().includes(query) ||
      incident.driver?.full_name?.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;

    const matchesDate =
      !dateFilter ||
      incident.incident_date === format(dateFilter, "yyyy-MM-dd");

    return matchesSearch && matchesStatus && matchesDate;
  });

  const IncidentForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Päivämäärä *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.incident_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.incident_date
                  ? format(formData.incident_date, "d.M.yyyy", { locale: fi })
                  : "Valitse päivämäärä"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.incident_date}
                onSelect={(date) =>
                  setFormData({ ...formData, incident_date: date || new Date() })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Tyyppi *</Label>
          <Select
            value={formData.incident_type}
            onValueChange={(value: IncidentType) =>
              setFormData({ ...formData, incident_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(incidentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ajoneuvo</Label>
          <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={vehicleOpen}
                className="w-full justify-between"
              >
                {formData.vehicle_id
                  ? vehicles.find((v) => v.id === formData.vehicle_id)
                      ?.registration_number
                  : "Valitse ajoneuvo..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Hae ajoneuvoa..." />
                <CommandList>
                  <CommandEmpty>Ei ajoneuvoja.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        setFormData({ ...formData, vehicle_id: "" });
                        setVehicleOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.vehicle_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Ei ajoneuvoa
                    </CommandItem>
                    {vehicles.map((vehicle) => (
                      <CommandItem
                        key={vehicle.id}
                        value={`${vehicle.registration_number} ${vehicle.vehicle_number}`}
                        onSelect={() => {
                          setFormData({ ...formData, vehicle_id: vehicle.id });
                          setVehicleOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.vehicle_id === vehicle.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
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
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={driverOpen}
                className="w-full justify-between"
              >
                {formData.driver_id
                  ? driversData.find((d) => d.id === formData.driver_id)?.full_name
                  : "Valitse kuljettaja..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Hae kuljettajaa..." />
                <CommandList>
                  <CommandEmpty>Ei kuljettajia.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        setFormData({ ...formData, driver_id: "" });
                        setDriverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.driver_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Ei kuljettajaa
                    </CommandItem>
                    {driversData.map((driver) => (
                      <CommandItem
                        key={driver.id}
                        value={`${driver.full_name} ${driver.driver_number}`}
                        onSelect={() => {
                          setFormData({ ...formData, driver_id: driver.id });
                          setDriverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.driver_id === driver.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
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
          <Label htmlFor="source">Lähde</Label>
          <Input
            id="source"
            value={formData.source}
            onChange={(e) =>
              setFormData({ ...formData, source: e.target.value })
            }
            placeholder="Esim. Asiakaspalaute, Välityskeskus"
          />
        </div>
        <div className="space-y-2">
          <Label>Tila</Label>
          <Select
            value={formData.status}
            onValueChange={(value: IncidentStatus) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Kuvaus *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Kuvaa tapaus..."
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="action_taken">Toimenpiteet</Label>
        <Textarea
          id="action_taken"
          value={formData.action_taken}
          onChange={(e) =>
            setFormData({ ...formData, action_taken: e.target.value })
          }
          placeholder="Mitä toimenpiteitä on tehty..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsAddDialogOpen(false);
            setSelectedIncident(null);
            resetForm();
          }}
        >
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
            <h1 className="text-3xl font-bold text-foreground">Laadunvalvonta</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse laatutapauksia ja asiakaspalautteita
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Lisää tapaus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Lisää uusi laatutapaus</DialogTitle>
              </DialogHeader>
              <IncidentForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hae kuvauksella, lähteellä..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tila" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki tilat</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateFilter
                  ? format(dateFilter, "d.M.yyyy", { locale: fi })
                  : "Päivämäärä"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {dateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter(undefined)}
            >
              Tyhjennä
            </Button>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog
          open={!!selectedIncident}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedIncident(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Muokkaa tapausta</DialogTitle>
            </DialogHeader>
            <IncidentForm />
          </DialogContent>
        </Dialog>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">Pvm</TableHead>
                <TableHead className="font-semibold text-foreground">Tyyppi</TableHead>
                <TableHead className="font-semibold text-foreground">Ajoneuvo</TableHead>
                <TableHead className="font-semibold text-foreground">Kuljettaja</TableHead>
                <TableHead className="font-semibold text-foreground">Kuvaus</TableHead>
                <TableHead className="font-semibold text-foreground">Tila</TableHead>
                <TableHead className="font-semibold text-foreground">Käsittelijä</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Ladataan...
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ei laatutapauksia</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(new Date(incident.incident_date), "d.M.yyyy", { locale: fi })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {incidentTypeLabels[incident.incident_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {incident.vehicle
                        ? `${incident.vehicle.registration_number}`
                        : "—"}
                    </TableCell>
                    <TableCell>{incident.driver?.full_name || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {incident.description}
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
                      {incident.updater?.full_name || incident.creator?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(incident)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
