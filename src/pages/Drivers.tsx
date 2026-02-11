import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Users, Search, Trash2, ExternalLink } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

const FINNISH_PROVINCES = [
  "Uusimaa", "Varsinais-Suomi", "Satakunta", "Kanta-Häme", "Pirkanmaa",
  "Päijät-Häme", "Kymenlaakso", "Etelä-Karjala", "Etelä-Savo", "Pohjois-Savo",
  "Pohjois-Karjala", "Keski-Suomi", "Etelä-Pohjanmaa", "Pohjanmaa",
  "Keski-Pohjanmaa", "Pohjois-Pohjanmaa", "Kainuu", "Lappi", "Ahvenanmaa",
];

// Note: municipalities are fetched from DB below

interface Driver {
  id: string;
  driver_number: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  driver_license_valid_until: string | null;
  notes: string | null;
  status: string;
  company_id: string | null;
  province: string | null;
  city: string | null;
  ssn_encrypted: string | null;
  company?: { name: string } | null;
}

interface DriverForm {
  full_name: string;
  phone: string;
  email: string;
  driver_number: string;
  driver_license_valid_until: Date | undefined;
  notes: string;
  status: string;
  company_id: string;
  province: string;
  city: string;
  ssn_encrypted: string;
}

const defaultForm: DriverForm = {
  full_name: "",
  phone: "",
  email: "",
  driver_number: "",
  driver_license_valid_until: undefined,
  notes: "",
  status: "active",
  company_id: "",
  province: "",
  city: "",
  ssn_encrypted: "",
};

const validateHetu = (hetu: string): boolean => {
  if (!hetu) return true;
  return /^\d{6}[-+A-Ya-y]\d{3}[\dA-Za-z]$/.test(hetu);
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

  // Fetch drivers from drivers table
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          company:companies(name)
        `)
        .order("full_name");

      if (error) throw error;
      return data as Driver[];
    },
  });

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch municipalities from DB
  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("name, province").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Create driver mutation
  const createMutation = useMutation({
    mutationFn: async (formData: DriverForm) => {
      const { error } = await supabase
        .from("drivers")
        .insert([{
          full_name: formData.full_name,
          phone: formData.phone || null,
          email: formData.email || null,
          driver_number: formData.driver_number,
          driver_license_valid_until: formData.driver_license_valid_until
            ? format(formData.driver_license_valid_until, "yyyy-MM-dd")
            : null,
          notes: formData.notes || null,
          status: formData.status,
          company_id: formData.company_id || null,
          province: formData.province || null,
          city: formData.city || null,
          ssn_encrypted: formData.ssn_encrypted || null,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Kuljettaja lisätty onnistuneesti");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Create driver error:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Kuljettajanumero on jo käytössä");
      } else {
        toast.error("Virhe: " + error.message);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: DriverForm) => {
      if (!editingId) return;

      const { error } = await supabase
        .from("drivers")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          email: formData.email || null,
          driver_number: formData.driver_number,
          driver_license_valid_until: formData.driver_license_valid_until
            ? format(formData.driver_license_valid_until, "yyyy-MM-dd")
            : null,
          notes: formData.notes || null,
          status: formData.status,
          company_id: formData.company_id || null,
          province: formData.province || null,
          city: formData.city || null,
          ssn_encrypted: formData.ssn_encrypted || null,
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Kuljettaja poistettu");
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (driver: Driver) => {
    setForm({
      full_name: driver.full_name || "",
      phone: driver.phone || "",
      email: driver.email || "",
      driver_number: driver.driver_number || "",
      driver_license_valid_until: driver.driver_license_valid_until
        ? new Date(driver.driver_license_valid_until)
        : undefined,
      notes: driver.notes || "",
      status: driver.status || "active",
      company_id: driver.company_id || "",
      province: driver.province || "",
      city: driver.city || "",
      ssn_encrypted: driver.ssn_encrypted || "",
    });
    setEditingId(driver.id);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.driver_number) {
      toast.error("Nimi ja kuljettajanumero ovat pakollisia");
      return;
    }
    if (form.ssn_encrypted && !validateHetu(form.ssn_encrypted)) {
      toast.error("Henkilötunnus on virheellisessä muodossa");
      return;
    }
    if (editingId) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.driver_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData: paginatedDrivers,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredDrivers);

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

  const isCreating = !editingId;
  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Lisää kuljettaja
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isCreating ? "Lisää uusi kuljettaja" : "Muokkaa kuljettajaa"}
                </DialogTitle>
                <DialogDescription>
                  {isCreating 
                    ? "Syötä uuden kuljettajan tiedot." 
                    : "Päivitä kuljettajan tiedot."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Puhelin</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Sähköposti</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="matti@esimerkki.fi"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Tila</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => setForm({ ...form, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiivinen</SelectItem>
                        <SelectItem value="inactive">Ei-aktiivinen</SelectItem>
                        <SelectItem value="suspended">Estetty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Yritys</Label>
                  <Select
                    value={form.company_id || "none"}
                    onValueChange={(value) => setForm({ ...form, company_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Valitse yritys" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ei yritystä</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maakunta</Label>
                    <Select
                      value={form.province || "none"}
                      onValueChange={(value) => setForm({ ...form, province: value === "none" ? "" : value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Valitse maakunta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ei valittu</SelectItem>
                        {FINNISH_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Kaupunki</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Esim. Helsinki"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssn">Henkilötunnus (HETU)</Label>
                  <Input
                    id="ssn"
                    value={form.ssn_encrypted}
                    onChange={(e) => setForm({ ...form, ssn_encrypted: e.target.value })}
                    placeholder="120190-123A"
                  />
                  <p className="text-xs text-muted-foreground">Muoto: PPKKVV-XXXC (uudet välimerkit tuettu)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Muistiinpanot</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Lisätietoja kuljettajasta..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Peruuta
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Tallennetaan..." : isCreating ? "Lisää kuljettaja" : "Tallenna"}
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
            placeholder="Hae nimellä, numerolla tai yrityksellä..."
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
                <TableHead className="font-semibold text-foreground">Numero</TableHead>
                <TableHead className="font-semibold text-foreground">Yritys</TableHead>
                <TableHead className="font-semibold text-foreground">Puhelin</TableHead>
                <TableHead className="font-semibold text-foreground">Ajokortti</TableHead>
                <TableHead className="font-semibold text-foreground">Tila</TableHead>
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
              ) : paginatedDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Ei kuljettajia löytynyt</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDrivers.map((driver) => (
                  <TableRow key={driver.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{driver.full_name}</TableCell>
                    <TableCell>{driver.driver_number}</TableCell>
                    <TableCell>{driver.company?.name || "—"}</TableCell>
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
                      <Badge
                        variant="outline"
                        className={cn(
                          driver.status === "active" && "bg-status-active/20 text-status-active border-status-active/30",
                          driver.status === "inactive" && "bg-muted text-muted-foreground",
                          driver.status === "suspended" && "bg-destructive/20 text-destructive border-destructive/30"
                        )}
                      >
                        {driver.status === "active" ? "Aktiivinen" : driver.status === "inactive" ? "Ei-aktiivinen" : "Estetty"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/kuljettajat/${driver.id}`)} title="Avaa profiili">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(driver)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Haluatko varmasti poistaa?")) deleteMutation.mutate(driver.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
