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
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
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
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverForm {
  full_name: string;
  phone: string;
  driver_number: string;
  driver_license_valid_until: Date | undefined;
  email: string;
  password: string;
}

const defaultForm: DriverForm = {
  full_name: "",
  phone: "",
  driver_number: "",
  driver_license_valid_until: undefined,
  email: "",
  password: "",
};

export default function Drivers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Fetch drivers (profiles with driver_number)
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("driver_number", "is", null)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: DriverForm) => {
      if (!editingId) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          driver_number: formData.driver_number,
          driver_license_valid_until: formData.driver_license_valid_until
            ? format(formData.driver_license_valid_until, "yyyy-MM-dd")
            : null,
        })
        .eq("id", editingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Kuljettaja päivitetty");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (driver: any) => {
    setForm({
      full_name: driver.full_name || "",
      phone: driver.phone || "",
      driver_number: driver.driver_number || "",
      driver_license_valid_until: driver.driver_license_valid_until
        ? new Date(driver.driver_license_valid_until)
        : undefined,
      email: "",
      password: "",
    });
    setEditingId(driver.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(form);
    }
  };

  const filteredDrivers = drivers.filter((d: any) =>
    d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.driver_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLicenseExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isLicenseExpired = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    return expiryDate < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kuljettajat</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse kuljettajien tietoja
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Muokkaa kuljettajaa
                </DialogTitle>
                <DialogDescription>
                  Päivitä kuljettajan tiedot.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nimi *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Matti Meikäläinen"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver_number">Kuljettajanumero *</Label>
                    <Input
                      id="driver_number"
                      value={form.driver_number}
                      onChange={(e) => setForm({ ...form, driver_number: e.target.value })}
                      placeholder="K001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Puhelin</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ammattiajon voimassaolo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.driver_license_valid_until && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.driver_license_valid_until ? (
                          format(form.driver_license_valid_until, "d.M.yyyy", { locale: fi })
                        ) : (
                          "Valitse päivämäärä"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.driver_license_valid_until}
                        onSelect={(date) => setForm({ ...form, driver_license_valid_until: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Peruuta
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Tallennetaan..." : "Tallenna"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hae nimellä tai kuljettajanumerolla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">Nimi</TableHead>
                <TableHead className="font-semibold text-foreground">Kuljettajanumero</TableHead>
                <TableHead className="font-semibold text-foreground">Puhelin</TableHead>
                <TableHead className="font-semibold text-foreground">Ammattiajon voimassaolo</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Ladataan...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ei kuljettajia löytynyt</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver: any) => (
                  <TableRow key={driver.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{driver.full_name || "—"}</TableCell>
                    <TableCell>{driver.driver_number}</TableCell>
                    <TableCell>{driver.phone || "—"}</TableCell>
                    <TableCell>
                      {driver.driver_license_valid_until ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            isLicenseExpired(driver.driver_license_valid_until)
                              ? "bg-destructive/20 text-destructive"
                              : isLicenseExpiringSoon(driver.driver_license_valid_until)
                              ? "bg-status-maintenance/20 text-status-maintenance"
                              : "bg-status-active/20 text-status-active"
                          )}
                        >
                          {format(new Date(driver.driver_license_valid_until), "d.M.yyyy", { locale: fi })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(driver)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            💡 <strong>Vinkki:</strong> Uudet kuljettajat luodaan rekisteröitymällä järjestelmään. 
            Ylläpitäjä voi sen jälkeen päivittää kuljettajanumerot ja muut tiedot.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
