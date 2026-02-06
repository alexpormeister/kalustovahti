import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, Pencil, Trash2, Car, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface VehicleForm {
  registration_number: string;
  vehicle_number: string;
  brand: string;
  model: string;
  company_id: string;
  payment_terminal_id: string;
  meter_serial_number: string;
  status: "active" | "maintenance" | "removed";
  attributes: string[];
}

const defaultForm: VehicleForm = {
  registration_number: "",
  vehicle_number: "",
  brand: "",
  model: "",
  company_id: "",
  payment_terminal_id: "",
  meter_serial_number: "",
  status: "active",
  attributes: [],
};

export default function Vehicles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Fetch vehicles
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          company:companies(id, name),
          vehicle_attribute_links(
            attribute:vehicle_attributes(id, name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch attributes for checkboxes
  const { data: attributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_attributes")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: VehicleForm) => {
      if (editingId) {
        // Update vehicle
        const { error } = await supabase
          .from("vehicles")
          .update({
            registration_number: formData.registration_number,
            vehicle_number: formData.vehicle_number,
            brand: formData.brand,
            model: formData.model,
            company_id: formData.company_id || null,
            payment_terminal_id: formData.payment_terminal_id || null,
            meter_serial_number: formData.meter_serial_number || null,
            status: formData.status,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Update attribute links
        await supabase
          .from("vehicle_attribute_links")
          .delete()
          .eq("vehicle_id", editingId);

        if (formData.attributes.length > 0) {
          await supabase.from("vehicle_attribute_links").insert(
            formData.attributes.map((attrId) => ({
              vehicle_id: editingId,
              attribute_id: attrId,
            }))
          );
        }
      } else {
        // Create vehicle
        const { data, error } = await supabase
          .from("vehicles")
          .insert({
            registration_number: formData.registration_number,
            vehicle_number: formData.vehicle_number,
            brand: formData.brand,
            model: formData.model,
            company_id: formData.company_id || null,
            payment_terminal_id: formData.payment_terminal_id || null,
            meter_serial_number: formData.meter_serial_number || null,
            status: formData.status,
          })
          .select()
          .single();

        if (error) throw error;

        // Add attribute links
        if (formData.attributes.length > 0 && data) {
          await supabase.from("vehicle_attribute_links").insert(
            formData.attributes.map((attrId) => ({
              vehicle_id: data.id,
              attribute_id: attrId,
            }))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(editingId ? "Ajoneuvo päivitetty" : "Ajoneuvo lisätty");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Ajoneuvo poistettu");
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (vehicle: any) => {
    setForm({
      registration_number: vehicle.registration_number,
      vehicle_number: vehicle.vehicle_number,
      brand: vehicle.brand,
      model: vehicle.model,
      company_id: vehicle.company_id || "",
      payment_terminal_id: vehicle.payment_terminal_id || "",
      meter_serial_number: vehicle.meter_serial_number || "",
      status: vehicle.status,
      attributes: vehicle.vehicle_attribute_links?.map((l: any) => l.attribute?.id).filter(Boolean) || [],
    });
    setEditingId(vehicle.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const filteredVehicles = vehicles.filter((v: any) => {
    const matchesSearch =
      v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Autot</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse kaluston ajoneuvoja
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Lisää ajoneuvo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Muokkaa ajoneuvoa" : "Lisää uusi ajoneuvo"}
                </DialogTitle>
                <DialogDescription>
                  Täytä ajoneuvon tiedot alla olevaan lomakkeeseen.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Rekisterinumero *</Label>
                    <Input
                      id="registration_number"
                      value={form.registration_number}
                      onChange={(e) => setForm({ ...form, registration_number: e.target.value.toUpperCase() })}
                      placeholder="ABC-123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_number">Autonumero *</Label>
                    <Input
                      id="vehicle_number"
                      value={form.vehicle_number}
                      onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                      placeholder="T001"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Merkki *</Label>
                    <Input
                      id="brand"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="Toyota"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Malli *</Label>
                    <Input
                      id="model"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="Camry Hybrid"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_id">Yritys</Label>
                    <Select
                      value={form.company_id}
                      onValueChange={(value) => setForm({ ...form, company_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Valitse yritys" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company: any) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Tila *</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: "active" | "maintenance" | "removed") => setForm({ ...form, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiivinen</SelectItem>
                        <SelectItem value="maintenance">Huollossa</SelectItem>
                        <SelectItem value="removed">Poistettu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_terminal_id">Maksupäätetunnus</Label>
                    <Input
                      id="payment_terminal_id"
                      value={form.payment_terminal_id}
                      onChange={(e) => setForm({ ...form, payment_terminal_id: e.target.value })}
                      placeholder="PT-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meter_serial_number">Mittarin sarjanumero</Label>
                    <Input
                      id="meter_serial_number"
                      value={form.meter_serial_number}
                      onChange={(e) => setForm({ ...form, meter_serial_number: e.target.value })}
                      placeholder="M-67890"
                    />
                  </div>
                </div>
                {/* Attributes */}
                <div className="space-y-2">
                  <Label>Ominaisuudet</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                    {attributes.map((attr: any) => (
                      <div key={attr.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`attr-${attr.id}`}
                          checked={form.attributes.includes(attr.id)}
                          onCheckedChange={(checked) => {
                            setForm({
                              ...form,
                              attributes: checked
                                ? [...form.attributes, attr.id]
                                : form.attributes.filter((id) => id !== attr.id),
                            });
                          }}
                        />
                        <label
                          htmlFor={`attr-${attr.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {attr.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Peruuta
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Tallennetaan..." : "Tallenna"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hae rekisterinumerolla tai autonumerolla..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kaikki tilat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki tilat</SelectItem>
              <SelectItem value="active">Aktiivinen</SelectItem>
              <SelectItem value="maintenance">Huollossa</SelectItem>
              <SelectItem value="removed">Poistettu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">Rekisterinumero</TableHead>
                <TableHead className="font-semibold text-foreground">Autonumero</TableHead>
                <TableHead className="font-semibold text-foreground">Merkki / Malli</TableHead>
                <TableHead className="font-semibold text-foreground">Yritys</TableHead>
                <TableHead className="font-semibold text-foreground">Tila</TableHead>
                <TableHead className="font-semibold text-foreground">Ominaisuudet</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Ladataan...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ei ajoneuvoja löytynyt</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle: any) => (
                  <TableRow key={vehicle.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{vehicle.registration_number}</TableCell>
                    <TableCell>{vehicle.vehicle_number}</TableCell>
                    <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                    <TableCell>{vehicle.company?.name || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.vehicle_attribute_links?.map((link: any) => (
                          <span
                            key={link.attribute?.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                          >
                            {link.attribute?.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(vehicle)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Haluatko varmasti poistaa tämän ajoneuvon?")) {
                              deleteMutation.mutate(vehicle.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
