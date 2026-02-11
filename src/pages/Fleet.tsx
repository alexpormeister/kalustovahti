import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Car, Plus, Search, Filter, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

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

export default function Fleet() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attributeFilters, setAttributeFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    registration_number: "",
    vehicle_number: "",
    brand: "",
    model: "",
    status: "active" as VehicleStatus,
    company_id: "",
    payment_terminal_id: "",
    meter_serial_number: "",
    city: "",
    selected_attributes: [] as string[],
    selected_fleets: [] as string[],
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

      // Fetch attributes
      const { data: attributeLinks } = await supabase
        .from("vehicle_attribute_links")
        .select("vehicle_id, attribute:vehicle_attributes(id, name)")
        .in("vehicle_id", vehicleIds);

      // Fetch fleet links
      const { data: fleetLinks } = await supabase
        .from("vehicle_fleet_links")
        .select("vehicle_id, fleet:fleets(id, name)")
        .in("vehicle_id", vehicleIds);

      return data.map((v: any) => ({
        ...v,
        attributes: attributeLinks?.filter((link: any) => link.vehicle_id === v.id).map((link: any) => link.attribute) || [],
        fleets: fleetLinks?.filter((link: any) => link.vehicle_id === v.id).map((link: any) => link.fleet) || [],
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newVehicle, error } = await supabase
        .from("vehicles")
        .insert([{
          registration_number: data.registration_number,
          vehicle_number: data.vehicle_number,
          brand: data.brand,
          model: data.model,
          status: data.status,
          company_id: data.company_id || null,
          payment_terminal_id: data.payment_terminal_id || null,
          meter_serial_number: data.meter_serial_number || null,
          city: data.city || null,
        }])
        .select()
        .single();
      if (error) throw error;

      // Add attribute links
      if (data.selected_attributes.length > 0) {
        await supabase.from("vehicle_attribute_links").insert(
          data.selected_attributes.map((attrId) => ({ vehicle_id: newVehicle.id, attribute_id: attrId }))
        );
      }

      // Add fleet links
      if (data.selected_fleets.length > 0) {
        await supabase.from("vehicle_fleet_links").insert(
          data.selected_fleets.map((fleetId) => ({ vehicle_id: newVehicle.id, fleet_id: fleetId }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      toast.success("Ajoneuvo lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Virhe lisättäessä ajoneuvoa"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("vehicles").update({
        registration_number: data.registration_number,
        vehicle_number: data.vehicle_number,
        brand: data.brand,
        model: data.model,
        status: data.status,
        company_id: data.company_id || null,
        payment_terminal_id: data.payment_terminal_id || null,
        meter_serial_number: data.meter_serial_number || null,
        city: data.city || null,
      }).eq("id", id);
      if (error) throw error;

      // Update attribute links
      await supabase.from("vehicle_attribute_links").delete().eq("vehicle_id", id);
      if (data.selected_attributes.length > 0) {
        await supabase.from("vehicle_attribute_links").insert(
          data.selected_attributes.map((attrId) => ({ vehicle_id: id, attribute_id: attrId }))
        );
      }

      // Update fleet links
      await supabase.from("vehicle_fleet_links").delete().eq("vehicle_id", id);
      if (data.selected_fleets.length > 0) {
        await supabase.from("vehicle_fleet_links").insert(
          data.selected_fleets.map((fleetId) => ({ vehicle_id: id, fleet_id: fleetId }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      toast.success("Ajoneuvo päivitetty onnistuneesti");
      setSelectedVehicle(null);
      resetForm();
    },
    onError: () => toast.error("Virhe päivitettäessä ajoneuvoa"),
  });

  const resetForm = () => {
    setFormData({
      registration_number: "", vehicle_number: "", brand: "", model: "",
      status: "active", company_id: "", payment_terminal_id: "",
      meter_serial_number: "", city: "", selected_attributes: [], selected_fleets: [],
    });
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      registration_number: vehicle.registration_number,
      vehicle_number: vehicle.vehicle_number,
      brand: vehicle.brand,
      model: vehicle.model,
      status: vehicle.status,
      company_id: vehicle.company_id || "",
      payment_terminal_id: vehicle.payment_terminal_id || "",
      meter_serial_number: vehicle.meter_serial_number || "",
      city: vehicle.city || "",
      selected_attributes: vehicle.attributes?.map((a) => a.id) || [],
      selected_fleets: vehicle.fleets?.map((f) => f.id) || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleAttributeFilter = (attrId: string) => {
    setAttributeFilters((prev) => prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      vehicle.registration_number.toLowerCase().includes(query) ||
      vehicle.vehicle_number.toLowerCase().includes(query) ||
      vehicle.brand.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      vehicle.driver?.full_name?.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    const matchesAttributes = attributeFilters.length === 0 ||
      attributeFilters.every((filterId) => vehicle.attributes?.some((attr) => attr.id === filterId));
    return matchesSearch && matchesStatus && matchesAttributes;
  });

  const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedVehicles, startIndex, endIndex, totalItems } = usePagination(filteredVehicles);

  const vehicleFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="registration_number">Rekisterinumero *</Label><Input id="registration_number" value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value.toUpperCase() })} required placeholder="ABC-123" /></div>
        <div><Label htmlFor="vehicle_number">Autonumero *</Label><Input id="vehicle_number" value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })} required placeholder="001" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="brand">Merkki *</Label><Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required placeholder="Toyota" /></div>
        <div><Label htmlFor="model">Malli *</Label><Input id="model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} required placeholder="Corolla" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="company_id">Yritys</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger><SelectValue placeholder="Valitse yritys" /></SelectTrigger>
            <SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="status">Tila</Label>
          <Select value={formData.status} onValueChange={(value: VehicleStatus) => setFormData({ ...formData, status: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiivinen</SelectItem>
              <SelectItem value="removed">Poistettu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="payment_terminal_id">Maksupääte-ID</Label><Input id="payment_terminal_id" value={formData.payment_terminal_id} onChange={(e) => setFormData({ ...formData, payment_terminal_id: e.target.value })} placeholder="PT-001234" /></div>
        <div><Label htmlFor="meter_serial_number">Mittarin sarjanumero</Label><Input id="meter_serial_number" value={formData.meter_serial_number} onChange={(e) => setFormData({ ...formData, meter_serial_number: e.target.value })} placeholder="SN-001234" /></div>
      </div>
      <div>
        <Label htmlFor="city">Kaupunki</Label>
        <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Esim. Helsinki" />
      </div>

      {/* Fleets - multiple selection */}
      {fleets.length > 0 && (
        <div>
          <Label>Fleetit (voit valita useita)</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {fleets.map((fleet) => (
              <div key={fleet.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`fleet-${fleet.id}`}
                  checked={formData.selected_fleets.includes(fleet.id)}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      selected_fleets: checked
                        ? [...prev.selected_fleets, fleet.id]
                        : prev.selected_fleets.filter((id) => id !== fleet.id),
                    }));
                  }}
                />
                <label htmlFor={`fleet-${fleet.id}`} className="text-sm cursor-pointer">{fleet.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      {attributes.length > 0 && (
        <div>
          <Label>Varustelu</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {attributes.map((attr) => (
              <div key={attr.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`attr-${attr.id}`}
                  checked={formData.selected_attributes.includes(attr.id)}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      selected_attributes: checked
                        ? [...prev.selected_attributes, attr.id]
                        : prev.selected_attributes.filter((id) => id !== attr.id),
                    }));
                  }}
                />
                <label htmlFor={`attr-${attr.id}`} className="text-sm cursor-pointer">{attr.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedVehicle(null); resetForm(); }}>Peruuta</Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Autot</h1>
            <p className="text-muted-foreground mt-1">Kaikki ajoneuvot ja niiden varustelu</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />Lisää ajoneuvo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Lisää uusi ajoneuvo</DialogTitle></DialogHeader>
              {vehicleFormJSX}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hae rekisterinumerolla, autonumerolla, kuljettajalla..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tila" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki tilat</SelectItem>
              <SelectItem value="active">Aktiiviset</SelectItem>
              <SelectItem value="removed">Poistetut</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showFilters ? "default" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && attributes.length > 0 && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Suodata varustelulla</h4>
                {attributeFilters.length > 0 && <Button variant="ghost" size="sm" onClick={() => setAttributeFilters([])}>Tyhjennä<X className="ml-1 h-3 w-3" /></Button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {attributes.map((attr) => (
                  <Badge key={attr.id} variant={attributeFilters.includes(attr.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleAttributeFilter(attr.id)}>{attr.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicles Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" />Ajoneuvot ({filteredVehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
            ) : paginatedVehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Ei ajoneuvoja</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nro</TableHead>
                        <TableHead>Rekisteri</TableHead>
                        <TableHead>Merkki/Malli</TableHead>
                        <TableHead>Yritys</TableHead>
                        <TableHead>Fleetit</TableHead>
                        <TableHead>Varustelu</TableHead>
                        <TableHead>Tila</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-mono font-medium">{vehicle.vehicle_number}</TableCell>
                          <TableCell className="font-mono">{vehicle.registration_number}</TableCell>
                          <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                          <TableCell>{vehicle.company?.name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {vehicle.fleets && vehicle.fleets.length > 0
                                ? vehicle.fleets.map((f) => <Badge key={f.id} variant="outline" className="text-xs">{f.name}</Badge>)
                                : "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {vehicle.attributes?.slice(0, 3).map((attr) => <Badge key={attr.id} variant="secondary" className="text-xs">{attr.name}</Badge>)}
                              {(vehicle.attributes?.length || 0) > 3 && <Badge variant="secondary" className="text-xs">+{(vehicle.attributes?.length || 0) - 3}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={vehicle.status} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/kalusto/${vehicle.id}`)} title="Avaa profiili"><ExternalLink className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle)}>Muokkaa</Button>
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

        {/* Edit Dialog */}
        <Dialog open={!!selectedVehicle} onOpenChange={(open) => { if (!open) { setSelectedVehicle(null); resetForm(); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Muokkaa ajoneuvoa: {selectedVehicle?.registration_number}</DialogTitle></DialogHeader>
            {vehicleFormJSX}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
