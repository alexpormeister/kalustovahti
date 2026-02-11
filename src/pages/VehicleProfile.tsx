import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Car, History, Tag, Building2, Smartphone, CreditCard, Pencil, Save, X, Layers, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { toast } from "sonner";

export default function VehicleProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, company:companies(id, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: vehicleFleets = [] } = useQuery({
    queryKey: ["vehicle-fleets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_fleet_links")
        .select("fleet:fleets(id, name)")
        .eq("vehicle_id", id);
      if (error) throw error;
      return data.map((l: any) => l.fleet);
    },
    enabled: !!id,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
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

  const { data: allAttributes = [] } = useQuery({
    queryKey: ["all-vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attributes = [] } = useQuery({
    queryKey: ["vehicle-profile-attributes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_attribute_links")
        .select("attribute:vehicle_attributes(id, name)")
        .eq("vehicle_id", id);
      if (error) throw error;
      return data.map((l: any) => l.attribute);
    },
    enabled: !!id,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["vehicle-devices", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hardware_devices").select("*").eq("vehicle_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: availableDevices = [] } = useQuery({
    queryKey: ["available-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hardware_devices")
        .select("*")
        .is("vehicle_id", null)
        .eq("status", "available")
        .order("device_type");
      if (error) throw error;
      return data;
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["vehicle-audit-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs").select("*")
        .eq("table_name", "vehicles").eq("record_id", id)
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
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

      // Update fleet links
      await supabase.from("vehicle_fleet_links").delete().eq("vehicle_id", id);
      if (data.selected_fleets?.length > 0) {
        const links = data.selected_fleets.map((fleetId: string) => ({
          vehicle_id: id,
          fleet_id: fleetId,
        }));
        await supabase.from("vehicle_fleet_links").insert(links);
      }

      // Update attribute links
      await supabase.from("vehicle_attribute_links").delete().eq("vehicle_id", id);
      if (data.selected_attributes?.length > 0) {
        const attrLinks = data.selected_attributes.map((attrId: string) => ({
          vehicle_id: id,
          attribute_id: attrId,
        }));
        await supabase.from("vehicle_attribute_links").insert(attrLinks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-fleets", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-profile-attributes", id] });
      toast.success("Ajoneuvo päivitetty");
      setIsEditing(false);
    },
    onError: () => toast.error("Virhe päivitettäessä"),
  });

  const linkDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("hardware_devices")
        .update({ vehicle_id: id })
        .eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-devices", id] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      toast.success("Laite liitetty ajoneuvoon");
      setIsAddDeviceOpen(false);
    },
    onError: () => toast.error("Virhe laitteen liittämisessä"),
  });

  const unlinkDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from("hardware_devices")
        .update({ vehicle_id: null })
        .eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-devices", id] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      toast.success("Laite irrotettu");
    },
    onError: () => toast.error("Virhe laitteen irrottamisessa"),
  });

  const startEditing = () => {
    if (!vehicle) return;
    setEditForm({
      registration_number: vehicle.registration_number,
      vehicle_number: vehicle.vehicle_number,
      brand: vehicle.brand,
      model: vehicle.model,
      status: vehicle.status,
      company_id: vehicle.company_id || "",
      payment_terminal_id: vehicle.payment_terminal_id || "",
      meter_serial_number: vehicle.meter_serial_number || "",
      city: (vehicle as any).city || "",
      selected_fleets: vehicleFleets.map((f: any) => f.id),
      selected_attributes: attributes.map((a: any) => a.id),
    });
    setIsEditing(true);
  };

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    Object.keys({ ...oldData, ...newData }).forEach((key) => {
      if (key === "updated_at" || key === "created_at") return;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({ field: key, oldValue: oldData[key], newValue: newData[key] });
      }
    });
    return changes;
  };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-96 text-muted-foreground">Ladataan...</div></DashboardLayout>;
  if (!vehicle) return <DashboardLayout><div className="flex flex-col items-center justify-center h-96 gap-4"><p className="text-muted-foreground">Ajoneuvoa ei löytynyt</p><Button onClick={() => navigate("/kalusto")}><ArrowLeft className="h-4 w-4 mr-2" />Takaisin</Button></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kalusto")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{vehicle.registration_number}</h1>
            <p className="text-muted-foreground">Auto #{vehicle.vehicle_number} — {vehicle.brand} {vehicle.model}</p>
          </div>
          <Badge variant="outline" className={vehicle.status === "active" ? "bg-status-active/20 text-status-active border-status-active/30" : "bg-muted text-muted-foreground"}>
            {vehicle.status === "active" ? "Aktiivinen" : "Poistettu"}
          </Badge>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="devices">Laitteet ({devices.length})</TabsTrigger>
            <TabsTrigger value="logs">Loki</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Ajoneuvon tiedot
                  </CardTitle>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={startEditing}><Pencil className="h-4 w-4 mr-1" />Muokkaa</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-1" />Peruuta</Button>
                      <Button size="sm" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />Tallenna</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>Rekisterinumero</Label><Input value={editForm.registration_number} onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value.toUpperCase() })} /></div>
                      <div><Label>Autonumero</Label><Input value={editForm.vehicle_number} onChange={(e) => setEditForm({ ...editForm, vehicle_number: e.target.value })} /></div>
                      <div><Label>Merkki</Label><Input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} /></div>
                      <div><Label>Malli</Label><Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} /></div>
                      <div><Label>Yritys</Label>
                        <Select value={editForm.company_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, company_id: v === "none" ? "" : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ei yritystä</SelectItem>
                            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Kaupunki</Label><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Esim. Helsinki" /></div>
                      <div><Label>Tila</Label>
                        <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Aktiivinen</SelectItem>
                            <SelectItem value="removed">Poistettu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Maksupääte-ID</Label><Input value={editForm.payment_terminal_id} onChange={(e) => setEditForm({ ...editForm, payment_terminal_id: e.target.value })} /></div>
                      <div><Label>Mittarin sarjanumero</Label><Input value={editForm.meter_serial_number} onChange={(e) => setEditForm({ ...editForm, meter_serial_number: e.target.value })} /></div>
                    </div>

                    {/* Fleets */}
                    {fleets.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Layers className="h-4 w-4" />Fleetit</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {fleets.map((f) => (
                            <div key={f.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`fleet-edit-${f.id}`}
                                checked={editForm.selected_fleets?.includes(f.id)}
                                onCheckedChange={(checked) => {
                                  setEditForm((prev: any) => ({
                                    ...prev,
                                    selected_fleets: checked
                                      ? [...(prev.selected_fleets || []), f.id]
                                      : (prev.selected_fleets || []).filter((id: string) => id !== f.id),
                                  }));
                                }}
                              />
                              <label htmlFor={`fleet-edit-${f.id}`} className="text-sm cursor-pointer">{f.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attributes inline */}
                    {allAttributes.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4" />Varustelu</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {allAttributes.map((attr) => (
                            <div key={attr.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`attr-edit-${attr.id}`}
                                checked={editForm.selected_attributes?.includes(attr.id)}
                                onCheckedChange={(checked) => {
                                  setEditForm((prev: any) => ({
                                    ...prev,
                                    selected_attributes: checked
                                      ? [...(prev.selected_attributes || []), attr.id]
                                      : (prev.selected_attributes || []).filter((id: string) => id !== attr.id),
                                  }));
                                }}
                              />
                              <label htmlFor={`attr-edit-${attr.id}`} className="text-sm cursor-pointer">{attr.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><p className="text-sm text-muted-foreground">Rekisterinumero</p><p className="font-medium font-mono">{vehicle.registration_number}</p></div>
                      <div><p className="text-sm text-muted-foreground">Autonumero</p><p className="font-medium">{vehicle.vehicle_number}</p></div>
                      <div><p className="text-sm text-muted-foreground">Merkki / Malli</p><p className="font-medium">{vehicle.brand} {vehicle.model}</p></div>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Yritys</p>
                          {(vehicle as any).company?.name ? (
                            <button
                              onClick={() => navigate(`/autoilijat/${(vehicle as any).company.id}`)}
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              {(vehicle as any).company.name}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <p className="font-medium">—</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3"><Layers className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Fleetit</p><div className="flex flex-wrap gap-1">{vehicleFleets.length > 0 ? vehicleFleets.map((f: any) => <Badge key={f.id} variant="secondary" className="text-xs">{f.name}</Badge>) : <p className="font-medium">—</p>}</div></div></div>
                      <div><p className="text-sm text-muted-foreground">Kaupunki</p><p className="font-medium">{(vehicle as any).city || "—"}</p></div>
                      <div className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Maksupääte-ID</p><p className="font-medium font-mono">{vehicle.payment_terminal_id || "—"}</p></div></div>
                      <div><p className="text-sm text-muted-foreground">Mittarin sarjanumero</p><p className="font-medium font-mono">{vehicle.meter_serial_number || "—"}</p></div>
                    </div>

                    {/* Attributes display */}
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">Varustelu</p>
                      </div>
                      {attributes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Ei varustelua</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {attributes.map((a: any) => <Badge key={a.id} variant="secondary">{a.name}</Badge>)}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Liitetyt laitteet</CardTitle>
                  <Button size="sm" onClick={() => setIsAddDeviceOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" />Lisää laite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? <p className="text-muted-foreground text-center py-4">Ei laitteita</p> : (
                  <div className="space-y-2">
                    {devices.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div><p className="font-medium">{d.device_type}</p><p className="text-sm text-muted-foreground font-mono">{d.serial_number}</p></div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{d.status}</Badge>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => unlinkDeviceMutation.mutate(d.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Device Dialog */}
            <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Lisää laite ajoneuvoon</DialogTitle>
                </DialogHeader>
                <Command className="rounded-lg border">
                  <CommandInput placeholder="Hae laitetta sarjanumerolla tai tyypillä..." />
                  <CommandList>
                    <CommandEmpty>Ei vapaita laitteita</CommandEmpty>
                    <CommandGroup heading="Vapaat laitteet">
                      {availableDevices.map((device: any) => (
                        <CommandItem
                          key={device.id}
                          value={`${device.device_type} ${device.serial_number}`}
                          onSelect={() => linkDeviceMutation.mutate(device.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <p className="font-medium">{device.device_type}</p>
                              <p className="text-sm text-muted-foreground font-mono">{device.serial_number}</p>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Muutoshistoria</CardTitle></CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? <p className="text-muted-foreground text-center py-4">Ei lokimerkintöjä</p> : (
                  <div className="space-y-2">
                    {auditLogs.map((log: any) => {
                      const changes = getChangedFields(log.old_data, log.new_data);
                      return (
                        <div key={log.id} className="p-3 bg-muted/30 rounded-lg border text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={log.action === "create" ? "bg-status-active text-status-active-foreground" : log.action === "delete" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
                              {log.action === "create" ? "Luonti" : log.action === "update" ? "Muokkaus" : "Poisto"}
                            </Badge>
                            <span className="text-muted-foreground">{format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}</span>
                          </div>
                          {changes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {changes.slice(0, 5).map((c, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-medium">{c.field}:</span>{" "}
                                  <span className="text-destructive line-through">{JSON.stringify(c.oldValue) || "—"}</span>{" → "}
                                  <span className="text-status-active">{JSON.stringify(c.newValue) || "—"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
