import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Car, History, Tag, User, Building2, Smartphone, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";

export default function VehicleProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, company:companies(name), driver:drivers!vehicles_assigned_driver_id_fkey(full_name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
      const { data, error } = await supabase
        .from("hardware_devices")
        .select("*")
        .eq("vehicle_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["vehicle-audit-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "vehicles")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96 text-muted-foreground">Ladataan...</div></DashboardLayout>;
  }

  if (!vehicle) {
    return <DashboardLayout><div className="flex flex-col items-center justify-center h-96 gap-4"><p className="text-muted-foreground">Ajoneuvoa ei löytynyt</p><Button onClick={() => navigate("/kalusto")}><ArrowLeft className="h-4 w-4 mr-2" />Takaisin</Button></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kalusto")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{vehicle.registration_number}</h1>
            <p className="text-muted-foreground">Auto #{vehicle.vehicle_number} — {vehicle.brand} {vehicle.model}</p>
          </div>
          <Badge variant="outline" className={vehicle.status === "active" ? "bg-status-active/20 text-status-active border-status-active/30" : "bg-muted text-muted-foreground"}>
            {vehicle.status === "active" ? "Aktiivinen" : "Poistettu"}
          </Badge>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="attributes">Varustelu</TabsTrigger>
            <TabsTrigger value="devices">Laitteet ({devices.length})</TabsTrigger>
            <TabsTrigger value="logs">Loki</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Ajoneuvon tiedot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Rekisterinumero</p><p className="font-medium font-mono">{vehicle.registration_number}</p></div>
                <div><p className="text-sm text-muted-foreground">Autonumero</p><p className="font-medium">{vehicle.vehicle_number}</p></div>
                <div><p className="text-sm text-muted-foreground">Merkki / Malli</p><p className="font-medium">{vehicle.brand} {vehicle.model}</p></div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">Yritys</p><p className="font-medium">{(vehicle as any).company?.name || "—"}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">Kuljettaja</p><p className="font-medium">{(vehicle as any).driver?.full_name || "—"}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">Maksupääte-ID</p><p className="font-medium font-mono">{vehicle.payment_terminal_id || "—"}</p></div>
                </div>
                <div><p className="text-sm text-muted-foreground">Mittarin sarjanumero</p><p className="font-medium font-mono">{vehicle.meter_serial_number || "—"}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Varustelu</CardTitle></CardHeader>
              <CardContent>
                {attributes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Ei varustelua</p>
                ) : (
                  <div className="flex flex-wrap gap-2">{attributes.map((a: any) => <Badge key={a.id} variant="secondary">{a.name}</Badge>)}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Liitetyt laitteet</CardTitle></CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Ei laitteita</p>
                ) : (
                  <div className="space-y-2">
                    {devices.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{d.device_type}</p>
                          <p className="text-sm text-muted-foreground font-mono">{d.serial_number}</p>
                        </div>
                        <Badge variant="outline">{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Muutoshistoria</CardTitle></CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Ei lokimerkintöjä</p>
                ) : (
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
