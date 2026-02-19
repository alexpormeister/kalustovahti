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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Plus, Search, Smartphone, Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { useCanEdit } from "@/components/auth/ProtectedPage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { cn } from "@/lib/utils";

// Searchable vehicle select
function VehicleSearchSelect({ vehicles, value, onChange }: { vehicles: any[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = vehicles.find((v) => v.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? `${selected.vehicle_number} - ${selected.registration_number}` : "Valitse auto..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Hae autonumerolla..." />
          <CommandList>
            <CommandEmpty>Ei tuloksia</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Ei liitetty
              </CommandItem>
              {vehicles.map((v) => (
                <CommandItem key={v.id} value={`${v.vehicle_number} ${v.registration_number}`} onSelect={() => { onChange(v.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === v.id ? "opacity-100" : "opacity-0")} />
                  {v.vehicle_number} - {v.registration_number}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Searchable company select
function CompanySearchSelect({ companies, value, onChange }: { companies: any[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = companies.find((c) => c.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? selected.name : "Valitse yritys..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Hae nimellä tai Y-tunnuksella..." />
          <CommandList>
            <CommandEmpty>Ei tuloksia</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Ei määritetty
              </CommandItem>
              {companies.map((c) => (
                <CommandItem key={c.id} value={`${c.name} ${c.business_id || ""}`} onSelect={() => { onChange(c.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span>{c.name}</span>
                    {c.business_id && <span className="ml-2 text-muted-foreground text-xs">{c.business_id}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type DeviceStatus = "available" | "installed" | "maintenance" | "decommissioned";

interface DeviceType {
  id: string;
  name: string;
  display_name: string;
  has_sim: boolean;
  sort_order: number;
}

interface HardwareDevice {
  id: string;
  device_type: string;
  serial_number: string;
  sim_number: string | null;
  description: string | null;
  status: DeviceStatus;
  vehicle_id: string | null;
  company_id: string | null;
  created_at: string;
  vehicle?: { registration_number: string; vehicle_number: string } | null;
  company?: { name: string } | null;
}

const statusLabels: Record<DeviceStatus, string> = {
  available: "Vapaana",
  installed: "Asennettu",
  maintenance: "Huollossa",
  decommissioned: "Poistettu käytöstä",
};

const statusColors: Record<DeviceStatus, string> = {
  available: "bg-status-active text-status-active-foreground",
  installed: "bg-primary text-primary-foreground",
  maintenance: "bg-status-maintenance text-status-maintenance-foreground",
  decommissioned: "bg-muted text-muted-foreground",
};

export default function Hardware() {
  const canEdit = useCanEdit("laitteet");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);
  const [formData, setFormData] = useState({
    device_type: "",
    serial_number: "",
    sim_number: "",
    description: "",
    status: "available" as DeviceStatus,
    vehicle_id: "",
    company_id: "",
    linked_device_id: "",
  });

  const queryClient = useQueryClient();

  // Fetch dynamic device types
  const { data: deviceTypes = [] } = useQuery({
    queryKey: ["device-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as DeviceType[];
    },
  });

  // Set initial active tab when device types load
  const effectiveTab = activeTab || deviceTypes[0]?.name || "";

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["hardware-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hardware_devices")
        .select(`*, vehicle:vehicles(registration_number, vehicle_number), company:companies(name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HardwareDevice[];
    },
  });

  // Fetch device links
  const { data: deviceLinks = [] } = useQuery({
    queryKey: ["device-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_links")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, business_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const deviceData = {
        device_type: data.device_type,
        serial_number: data.serial_number,
        sim_number: data.sim_number || null,
        description: data.description || null,
        status: data.status,
        vehicle_id: data.vehicle_id || null,
        company_id: data.company_id || null,
      };
      const { data: newDevice, error } = await supabase.from("hardware_devices").insert([deviceData]).select().single();
      if (error) throw error;
      
      // Create device link if specified
      if (data.linked_device_id && newDevice) {
        await supabase.from("device_links").insert([{
          source_device_id: newDevice.id,
          target_device_id: data.linked_device_id,
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hardware-devices"] });
      queryClient.invalidateQueries({ queryKey: ["device-links"] });
      toast.success("Laite lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Virhe lisättäessä laitetta"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const deviceData = {
        device_type: data.device_type,
        serial_number: data.serial_number,
        sim_number: data.sim_number || null,
        description: data.description || null,
        status: data.status,
        vehicle_id: data.vehicle_id || null,
        company_id: data.company_id || null,
      };
      const { error } = await supabase.from("hardware_devices").update(deviceData).eq("id", id);
      if (error) throw error;

      // Update device link
      await supabase.from("device_links").delete().eq("source_device_id", id);
      if (data.linked_device_id) {
        await supabase.from("device_links").insert([{
          source_device_id: id,
          target_device_id: data.linked_device_id,
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hardware-devices"] });
      queryClient.invalidateQueries({ queryKey: ["device-links"] });
      toast.success("Laite päivitetty onnistuneesti");
      setSelectedDevice(null);
      resetForm();
    },
    onError: () => toast.error("Virhe päivitettäessä laitetta"),
  });

  const resetForm = () => {
    setFormData({
      device_type: effectiveTab,
      serial_number: "",
      sim_number: "",
      description: "",
      status: "available",
      vehicle_id: "",
      company_id: "",
      linked_device_id: "",
    });
  };

  const handleEdit = (device: HardwareDevice) => {
    setSelectedDevice(device);
    const link = deviceLinks.find((l: any) => l.source_device_id === device.id);
    setFormData({
      device_type: device.device_type,
      serial_number: device.serial_number,
      sim_number: device.sim_number || "",
      description: device.description || "",
      status: device.status,
      vehicle_id: device.vehicle_id || "",
      company_id: device.company_id || "",
      linked_device_id: link?.target_device_id || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDevice) {
      updateMutation.mutate({ id: selectedDevice.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const currentDeviceType = deviceTypes.find((dt) => dt.name === effectiveTab);
  const otherDevices = devices.filter((d) => d.id !== selectedDevice?.id);

  const filteredDevices = devices.filter(
    (device) =>
      device.device_type === effectiveTab &&
      (device.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.sim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.vehicle?.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const {
    currentPage, setCurrentPage, totalPages,
    paginatedData: paginatedDevices, startIndex, endIndex, totalItems,
  } = usePagination(filteredDevices);

  const deviceCounts = deviceTypes.reduce((acc, dt) => {
    acc[dt.name] = devices.filter((d) => d.device_type === dt.name).length;
    return acc;
  }, {} as Record<string, number>);

  // Get linked device info
  const getLinkedDeviceName = (deviceId: string) => {
    const link = deviceLinks.find((l: any) => l.source_device_id === deviceId);
    if (!link) return null;
    const linkedDevice = devices.find((d) => d.id === link.target_device_id);
    if (!linkedDevice) return null;
    const linkedType = deviceTypes.find((dt) => dt.name === linkedDevice.device_type);
    return `${linkedType?.display_name || linkedDevice.device_type}: ${linkedDevice.serial_number}`;
  };

  const deviceFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Laitetyyppi *</Label>
          <Select
            value={formData.device_type}
            onValueChange={(value) => setFormData({ ...formData, device_type: value })}
            disabled={!canEdit}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {deviceTypes.map((dt) => (
                <SelectItem key={dt.id} value={dt.name}>{dt.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sarjanumero / ID *</Label>
          <Input
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            required
            placeholder="SN-001234"
            disabled={!canEdit}
          />
        </div>
      </div>

      {currentDeviceType?.has_sim && (
        <div>
          <Label>SIM-kortin numero</Label>
          <Input
            value={formData.sim_number}
            onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
            placeholder="+358..."
            disabled={!canEdit}
          />
        </div>
      )}

      <div>
        <Label>Kuvaus</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Laitteen lisätiedot..."
          disabled={!canEdit}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Liitetty autoon</Label>
          {canEdit ? (
            <VehicleSearchSelect
              vehicles={vehicles}
              value={formData.vehicle_id}
              onChange={(value) => setFormData({ ...formData, vehicle_id: value })}
            />
          ) : (
            <Input value={formData.vehicle_id ? vehicles.find(v => v.id === formData.vehicle_id)?.vehicle_number + ' - ' + vehicles.find(v => v.id === formData.vehicle_id)?.registration_number || '' : 'Ei liitetty'} disabled />
          )}
        </div>
        <div>
          <Label>Yritys</Label>
          {canEdit ? (
            <CompanySearchSelect
              companies={companies}
              value={formData.company_id}
              onChange={(value) => setFormData({ ...formData, company_id: value })}
            />
          ) : (
            <Input value={formData.company_id ? companies.find(c => c.id === formData.company_id)?.name || '' : 'Ei määritetty'} disabled />
          )}
        </div>
      </div>

      {/* Link to another device */}
      <div>
        <Label>Linkitetty laite</Label>
        <Select
          value={formData.linked_device_id || "none"}
          onValueChange={(value) => setFormData({ ...formData, linked_device_id: value === "none" ? "" : value })}
          disabled={!canEdit}
        >
          <SelectTrigger><SelectValue placeholder="Valitse laite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ei linkitetty</SelectItem>
            {otherDevices.map((d) => {
              const dt = deviceTypes.find((t) => t.name === d.device_type);
              return (
                <SelectItem key={d.id} value={d.id}>
                  {dt?.display_name || d.device_type}: {d.serial_number}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tila</Label>
        <Select
          value={formData.status}
          onValueChange={(value: DeviceStatus) => setFormData({ ...formData, status: value })}
          disabled={!canEdit}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Vapaana</SelectItem>
            <SelectItem value="installed">Asennettu</SelectItem>
            <SelectItem value="maintenance">Huollossa</SelectItem>
            <SelectItem value="decommissioned">Poistettu käytöstä</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedDevice(null); resetForm(); }}>
          {canEdit ? "Peruuta" : "Sulje"}
        </Button>
        {canEdit && <Button type="submit">Tallenna</Button>}
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Laitevarasto</h1>
            <p className="text-muted-foreground mt-1">Hallitse laitteita ja niiden linkityksiä</p>
          </div>
          {canEdit && <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setFormData((prev) => ({ ...prev, device_type: effectiveTab })); }}>
                <Plus className="h-4 w-4" />
                Lisää laite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Lisää uusi laite</DialogTitle></DialogHeader>
              {deviceFormJSX}
            </DialogContent>
          </Dialog>}
        </div>

        {/* Stats Cards - Dynamic */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deviceTypes.map((dt) => (
            <Card
              key={dt.id}
              className={`glass-card cursor-pointer transition-colors ${effectiveTab === dt.name ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveTab(dt.name)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{deviceCounts[dt.name] || 0}</p>
                    <p className="text-sm text-muted-foreground">{dt.display_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hae sarjanumerolla, SIM:llä tai autolla..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Devices Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {currentDeviceType?.display_name || "Laitteet"} ({filteredDevices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
            ) : paginatedDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Ei laitteita</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sarjanumero</TableHead>
                      {currentDeviceType?.has_sim && <TableHead>SIM-numero</TableHead>}
                      <TableHead>Auto</TableHead>
                      <TableHead>Yritys</TableHead>
                      <TableHead>Linkitetty</TableHead>
                      <TableHead>Tila</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDevices.map((device) => (
                      <TableRow key={device.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(device)}>
                        <TableCell className="font-mono font-medium">{device.serial_number}</TableCell>
                        {currentDeviceType?.has_sim && (
                          <TableCell>{device.sim_number || "—"}</TableCell>
                        )}
                        <TableCell>
                          {device.vehicle ? `${device.vehicle.vehicle_number} (${device.vehicle.registration_number})` : "—"}
                        </TableCell>
                        <TableCell>{device.company?.name || "—"}</TableCell>
                        <TableCell>
                          {getLinkedDeviceName(device.id) || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[device.status]}>{statusLabels[device.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(device); }}><ExternalLink className="h-4 w-4" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <PaginationControls
                  currentPage={currentPage} totalPages={totalPages}
                  onPageChange={setCurrentPage} startIndex={startIndex}
                  endIndex={endIndex} totalItems={totalItems}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!selectedDevice} onOpenChange={(open) => { if (!open) { setSelectedDevice(null); resetForm(); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{canEdit ? "Muokkaa laitetta" : "Laitteen tiedot"}: {selectedDevice?.serial_number}</DialogTitle>
            </DialogHeader>
            {deviceFormJSX}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
