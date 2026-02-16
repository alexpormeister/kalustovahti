import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Car, Plus, Search, Filter, X, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown } from "lucide-react";
import { CompanySearchSelect } from "@/components/shared/CompanySearchSelect";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { cn } from "@/lib/utils";

type VehicleStatus = "active" | "removed";

interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_number: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  company_id: string | null;
  assigned_driver_id: string | null;
  payment_terminal_id: string | null;
  meter_serial_number: string | null;
  city: string | null;
  company?: { name: string } | null;
  driver?: { full_name: string | null } | null;
  attributes?: { id: string; name: string }[];
  fleets?: { id: string; name: string }[];
}

interface Attribute {
  id: string;
  name: string;
}

// Device search select component
function DeviceSearchSelect({ devices, value, onChange, placeholder, deviceType }: {
  devices: any[]; value: string; onChange: (v: string) => void; placeholder: string; deviceType: string;
}) {
  const [open, setOpen] = useState(false);
  const availableDevices = devices.filter(d => d.device_type === deviceType && (d.status === "available" || d.serial_number === value));
  const selected = devices.find(d => d.serial_number === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Hae sarjanumerolla..." />
          <CommandList>
            <CommandEmpty>Ei vapaita laitteita</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />Tyhjä
              </CommandItem>
              {availableDevices.map(d => (
                <CommandItem key={d.id} value={d.serial_number} onSelect={() => { onChange(d.serial_number); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === d.serial_number ? "opacity-100" : "opacity-0")} />
                  {d.serial_number} {d.status === "available" ? "(Vapaana)" : "(Nykyinen)"}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Fleet() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attributeFilters, setAttributeFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("vehicle_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [fleetFilter, setFleetFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    registration_number: "", vehicle_number: "", brand: "", model: "",
    status: "active" as VehicleStatus, company_id: "", payment_terminal_id: "",
    meter_serial_number: "", city: "", selected_attributes: [] as string[], selected_fleets: [] as string[],
  });

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`*, company:companies(name), driver:drivers!vehicles_assigned_driver_id_fkey(full_name)`)
        .order("vehicle_number");
      if (error) throw error;
      const vehicleIds = data.map((v: any) => v.id);
      const { data: attributeLinks } = await supabase.from("vehicle_attribute_links").select("vehicle_id, attribute:vehicle_attributes(id, name)").in("vehicle_id", vehicleIds);
      const { data: fleetLinks } = await supabase.from("vehicle_fleet_links").select("vehicle_id, fleet:fleets(id, name)").in("vehicle_id", vehicleIds);
      return data.map((v: any) => ({
        ...v,
        attributes: attributeLinks?.filter((l: any) => l.vehicle_id === v.id).map((l: any) => l.attribute) || [],
        fleets: fleetLinks?.filter((l: any) => l.vehicle_id === v.id).map((l: any) => l.fleet) || [],
      })) as Vehicle[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attributes").select("id, name").order("name");
      if (error) throw error;
      return data as Attribute[];
    },
  });

  const { data: fleets = [] } = useQuery({
    queryKey: ["fleets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fleets").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch hardware devices for payment terminal and meter search
  const { data: hardwareDevices = [] } = useQuery({
    queryKey: ["hardware-devices-for-fleet"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hardware_devices").select("id, serial_number, device_type, status").order("serial_number");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newVehicle, error } = await supabase.from("vehicles").insert([{
        registration_number: data.registration_number, vehicle_number: data.vehicle_number,
        brand: data.brand, model: data.model, status: data.status,
        company_id: data.company_id || null, payment_terminal_id: data.payment_terminal_id || null,
        meter_serial_number: data.meter_serial_number || null, city: data.city || null,
      }]).select().single();
      if (error) throw error;
      if (data.selected_attributes.length > 0) await supabase.from("vehicle_attribute_links").insert(data.selected_attributes.map(a => ({ vehicle_id: newVehicle.id, attribute_id: a })));
      if (data.selected_fleets.length > 0) await supabase.from("vehicle_fleet_links").insert(data.selected_fleets.map(f => ({ vehicle_id: newVehicle.id, fleet_id: f })));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] }); toast.success("Ajoneuvo lisätty onnistuneesti"); setIsAddDialogOpen(false); resetForm(); },
    onError: (error: any) => {
      if (error?.message?.includes("idx_vehicles_unique_active_number")) {
        toast.error("Tällä autonumerolla on jo aktiivinen ajoneuvo");
      } else {
        toast.error("Virhe lisättäessä ajoneuvoa");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("vehicles").update({
        registration_number: data.registration_number, vehicle_number: data.vehicle_number,
        brand: data.brand, model: data.model, status: data.status,
        company_id: data.company_id || null, payment_terminal_id: data.payment_terminal_id || null,
        meter_serial_number: data.meter_serial_number || null, city: data.city || null,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("vehicle_attribute_links").delete().eq("vehicle_id", id);
      if (data.selected_attributes.length > 0) await supabase.from("vehicle_attribute_links").insert(data.selected_attributes.map(a => ({ vehicle_id: id, attribute_id: a })));
      await supabase.from("vehicle_fleet_links").delete().eq("vehicle_id", id);
      if (data.selected_fleets.length > 0) await supabase.from("vehicle_fleet_links").insert(data.selected_fleets.map(f => ({ vehicle_id: id, fleet_id: f })));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] }); toast.success("Ajoneuvo päivitetty onnistuneesti"); setSelectedVehicle(null); resetForm(); },
    onError: (error: any) => {
      if (error?.message?.includes("idx_vehicles_unique_active_number")) {
        toast.error("Tällä autonumerolla on jo aktiivinen ajoneuvo");
      } else {
        toast.error("Virhe päivitettäessä ajoneuvoa");
      }
    },
  });

  const resetForm = () => {
    setFormData({ registration_number: "", vehicle_number: "", brand: "", model: "", status: "active", company_id: "", payment_terminal_id: "", meter_serial_number: "", city: "", selected_attributes: [], selected_fleets: [] });
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      registration_number: vehicle.registration_number, vehicle_number: vehicle.vehicle_number,
      brand: vehicle.brand, model: vehicle.model, status: vehicle.status,
      company_id: vehicle.company_id || "", payment_terminal_id: vehicle.payment_terminal_id || "",
      meter_serial_number: vehicle.meter_serial_number || "", city: vehicle.city || "",
      selected_attributes: vehicle.attributes?.map(a => a.id) || [], selected_fleets: vehicle.fleets?.map(f => f.id) || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side duplicate vehicle number check
    if (formData.status !== "removed") {
      const duplicate = vehicles.find(v => 
        v.vehicle_number === formData.vehicle_number && 
        v.status !== "removed" && 
        v.id !== selectedVehicle?.id
      );
      if (duplicate) {
        toast.error(`Autonumero ${formData.vehicle_number} on jo käytössä aktiivisella ajoneuvolla (${duplicate.registration_number})`);
        return;
      }
    }
    if (selectedVehicle) updateMutation.mutate({ id: selectedVehicle.id, data: formData });
    else createMutation.mutate(formData);
  };

  const toggleAttributeFilter = (attrId: string) => {
    setAttributeFilters(prev => prev.includes(attrId) ? prev.filter(id => id !== attrId) : [...prev, attrId]);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filteredVehicles = vehicles
    .filter(vehicle => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = vehicle.registration_number.toLowerCase().includes(query) || vehicle.vehicle_number.toLowerCase().includes(query) || vehicle.brand.toLowerCase().includes(query) || vehicle.model.toLowerCase().includes(query) || vehicle.company?.name?.toLowerCase().includes(query) || vehicle.city?.toLowerCase().includes(query) || vehicle.payment_terminal_id?.toLowerCase().includes(query) || vehicle.meter_serial_number?.toLowerCase().includes(query) || vehicle.fleets?.some(f => f.name.toLowerCase().includes(query)) || vehicle.attributes?.some(a => a.name.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      const matchesCompany = companyFilter === "all" || vehicle.company_id === companyFilter;
      const matchesFleet = fleetFilter === "all" || vehicle.fleets?.some(f => f.id === fleetFilter);
      const matchesAttributes = attributeFilters.length === 0 || attributeFilters.every(fId => vehicle.attributes?.some(attr => attr.id === fId));
      return matchesSearch && matchesStatus && matchesCompany && matchesFleet && matchesAttributes;
    })
    .sort((a, b) => {
      if (sortField === "vehicle_number") {
        const cmp = (parseInt(a.vehicle_number, 10) || 0) - (parseInt(b.vehicle_number, 10) || 0) || a.vehicle_number.localeCompare(b.vehicle_number, "fi");
        return sortDir === "asc" ? cmp : -cmp;
      }
      let aVal = "", bVal = "";
      switch (sortField) {
        case "registration_number": aVal = a.registration_number; bVal = b.registration_number; break;
        case "brand": aVal = `${a.brand} ${a.model}`; bVal = `${b.brand} ${b.model}`; break;
        case "company": aVal = a.company?.name || ""; bVal = b.company?.name || ""; break;
        case "status": aVal = a.status; bVal = b.status; break;
      }
      const cmp = aVal.localeCompare(bVal, "fi");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedVehicles, startIndex, endIndex, totalItems } = usePagination(filteredVehicles);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const vehicleFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Rekisterinumero *</Label><Input value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value.toUpperCase() })} required placeholder="ABC-123" /></div>
        <div><Label>Autonumero *</Label><Input value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })} required placeholder="001" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Merkki *</Label><Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required placeholder="Toyota" /></div>
        <div><Label>Malli *</Label><Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} required placeholder="Corolla" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Yritys</Label><CompanySearchSelect value={formData.company_id} onChange={(value) => setFormData({ ...formData, company_id: value })} /></div>
        <div><Label>Tila</Label>
          <Select value={formData.status} onValueChange={(value: VehicleStatus) => setFormData({ ...formData, status: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Aktiivinen</SelectItem><SelectItem value="removed">Poistettu</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Maksupääte</Label>
          <DeviceSearchSelect devices={hardwareDevices} value={formData.payment_terminal_id} onChange={(v) => setFormData({ ...formData, payment_terminal_id: v })} placeholder="Valitse maksupääte..." deviceType="payment_terminal" />
        </div>
        <div><Label>Mittarin sarjanumero</Label>
          <DeviceSearchSelect devices={hardwareDevices} value={formData.meter_serial_number} onChange={(v) => setFormData({ ...formData, meter_serial_number: v })} placeholder="Valitse mittari..." deviceType="taximeter" />
        </div>
      </div>
      <div><Label>Kaupunki</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Esim. Helsinki" /></div>

      {fleets.length > 0 && (
        <div><Label>Fleetit</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {fleets.map(fleet => (
              <div key={fleet.id} className="flex items-center space-x-2">
                <Checkbox id={`fleet-${fleet.id}`} checked={formData.selected_fleets.includes(fleet.id)} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, selected_fleets: checked ? [...prev.selected_fleets, fleet.id] : prev.selected_fleets.filter(id => id !== fleet.id) }))} />
                <label htmlFor={`fleet-${fleet.id}`} className="text-sm cursor-pointer">{fleet.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {attributes.length > 0 && (
        <div><Label>Varustelu</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {attributes.map(attr => (
              <div key={attr.id} className="flex items-center space-x-2">
                <Checkbox id={`attr-${attr.id}`} checked={formData.selected_attributes.includes(attr.id)} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, selected_attributes: checked ? [...prev.selected_attributes, attr.id] : prev.selected_attributes.filter(id => id !== attr.id) }))} />
                <label htmlFor={`attr-${attr.id}`} className="text-sm cursor-pointer">{attr.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedVehicle(null); resetForm(); }}>Peruuta</Button>
        <Button type="submit">{selectedVehicle ? "Tallenna" : "Lisää"}</Button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold text-foreground">Autot</h1><p className="text-muted-foreground mt-1">Hallitse ajoneuvokantaa</p></div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />Lisää ajoneuvo</Button></DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Lisää uusi ajoneuvo</DialogTitle></DialogHeader>
              {vehicleFormJSX}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hae rekisterinumerolla, autonumerolla..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className="gap-2"><Filter className="h-4 w-4" />Suodattimet</Button>
        </div>

        {showFilters && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1"><Label>Tila</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Kaikki</SelectItem><SelectItem value="active">Aktiivinen</SelectItem><SelectItem value="removed">Poistettu</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Yritys</Label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Kaikki</SelectItem>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {fleets.length > 0 && (
                  <div className="space-y-1"><Label>Fleet</Label>
                    <Select value={fleetFilter} onValueChange={setFleetFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Kaikki</SelectItem>{fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {attributes.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block">Varustelu</Label>
                  <div className="flex flex-wrap gap-3">
                    {attributes.map(attr => (
                      <div key={attr.id} className="flex items-center gap-2">
                        <Checkbox checked={attributeFilters.includes(attr.id)} onCheckedChange={() => toggleAttributeFilter(attr.id)} />
                        <span className="text-sm">{attr.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!selectedVehicle} onOpenChange={(open) => { if (!open) { setSelectedVehicle(null); resetForm(); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Muokkaa ajoneuvoa</DialogTitle></DialogHeader>
            {vehicleFormJSX}
          </DialogContent>
        </Dialog>

        {/* Vehicles Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" />Ajoneuvot ({filteredVehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8 text-muted-foreground">Ladataan...</div> : paginatedVehicles.length === 0 ? <div className="text-center py-8 text-muted-foreground">Ei ajoneuvoja</div> : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("vehicle_number")}><div className="flex items-center gap-1">Nro <SortIcon field="vehicle_number" /></div></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("registration_number")}><div className="flex items-center gap-1">Rekisteri <SortIcon field="registration_number" /></div></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("brand")}><div className="flex items-center gap-1">Merkki/Malli <SortIcon field="brand" /></div></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("company")}><div className="flex items-center gap-1">Yritys <SortIcon field="company" /></div></TableHead>
                        <TableHead>Fleet</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}><div className="flex items-center gap-1">Tila <SortIcon field="status" /></div></TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVehicles.map(vehicle => (
                        <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/kalusto/${vehicle.id}`)}>
                          <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                          <TableCell>{vehicle.registration_number}</TableCell>
                          <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                          <TableCell>{vehicle.company?.name || "—"}</TableCell>
                          <TableCell>{vehicle.fleets?.map(f => <Badge key={f.id} variant="outline" className="mr-1 text-xs">{f.name}</Badge>) || "—"}</TableCell>
                          <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(vehicle)}><ExternalLink className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
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
