import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DeviceType {
  id: string;
  name: string;
  display_name: string;
  has_sim: boolean;
  sort_order: number;
  device_count?: number;
}

export function DeviceTypeManager() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    has_sim: false,
    sort_order: 0,
  });

  const { data: deviceTypes = [], isLoading } = useQuery({
    queryKey: ["device-types-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;

      // Get device counts
      const { data: devices } = await supabase
        .from("hardware_devices")
        .select("device_type");

      const countMap = new Map<string, number>();
      devices?.forEach((d: any) => {
        countMap.set(d.device_type, (countMap.get(d.device_type) || 0) + 1);
      });

      return data.map((dt: any) => ({
        ...dt,
        device_count: countMap.get(dt.name) || 0,
      })) as DeviceType[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("device_types").insert([{
        name: data.name.toLowerCase().replace(/\s+/g, "_"),
        display_name: data.display_name,
        has_sim: data.has_sim,
        sort_order: data.sort_order || deviceTypes.length + 1,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-types-admin"] });
      toast.success("Laitetyyppi lisätty");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("device_types")
        .update({
          display_name: data.display_name,
          has_sim: data.has_sim,
          sort_order: data.sort_order,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-types-admin"] });
      toast.success("Laitetyyppi päivitetty");
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-types-admin"] });
      toast.success("Laitetyyppi poistettu");
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const resetForm = () => {
    setFormData({ name: "", display_name: "", has_sim: false, sort_order: 0 });
  };

  const handleEdit = (dt: DeviceType) => {
    setEditing(dt);
    setFormData({
      name: dt.name,
      display_name: dt.display_name,
      has_sim: dt.has_sim,
      sort_order: dt.sort_order,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Näyttönimi *</Label>
        <Input
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder="esim. Kannettava tietokone"
          required
        />
      </div>
      {!editing && (
        <div>
          <Label>Tekninen nimi *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="esim. laptop"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Pieniä kirjaimia, ei välilyöntejä</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Switch
          checked={formData.has_sim}
          onCheckedChange={(v) => setFormData({ ...formData, has_sim: v })}
        />
        <Label>Sisältää SIM-kortin</Label>
      </div>
      <div>
        <Label>Järjestys</Label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditing(null); resetForm(); }}>
          Peruuta
        </Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Laitetyypit
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Lisää
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lisää laitetyyppi</DialogTitle>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Ladataan...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead>SIM</TableHead>
                <TableHead>Laitteita</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceTypes.map((dt) => (
                <TableRow key={dt.id}>
                  <TableCell className="font-medium">{dt.display_name}</TableCell>
                  <TableCell>
                    {dt.has_sim ? (
                      <Badge className="bg-primary text-primary-foreground">Kyllä</Badge>
                    ) : (
                      <Badge variant="outline">Ei</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dt.device_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dt)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={(dt.device_count || 0) > 0}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Poista laitetyyppi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Haluatko varmasti poistaa laitetyypin "{dt.display_name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Peruuta</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(dt.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Poista
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Muokkaa laitetyyppiä</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
