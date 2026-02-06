import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Settings as SettingsIcon, User, Shield, Bell, Tag, Users, Edit2, Trash2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type AppRole = "admin" | "manager" | "driver";

interface UserProfile {
  id: string;
  full_name: string | null;
  driver_number: string | null;
  phone: string | null;
  email?: string;
  role?: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Ylläpitäjä",
  manager: "Yrittäjä",
  driver: "Kuljettaja",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  manager: "bg-primary text-primary-foreground",
  driver: "bg-muted text-muted-foreground",
};

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    driver_number: "",
    phone: "",
    role: "driver" as AppRole,
  });

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsAdmin(data?.role === "admin");
      }
    };
    checkAdmin();
  }, []);

  // Fetch all users with their roles (only for admins)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      
      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      // Map roles to profiles
      const rolesMap = new Map(roles?.map((r: any) => [r.user_id, r.role]));

      return profiles.map((p: any) => ({
        ...p,
        role: rolesMap.get(p.id) || "driver",
      })) as UserProfile[];
    },
    enabled: isAdmin,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data, newRole }: { userId: string; data: any; newRole: AppRole }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          driver_number: data.driver_number || null,
          phone: data.phone || null,
        })
        .eq("id", userId);
      
      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Käyttäjä päivitetty onnistuneesti");
      setSelectedUser(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Virhe päivitettäessä käyttäjää");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete role first
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Käyttäjä poistettu onnistuneesti");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Virhe poistettaessa käyttäjää. Käyttäjän auth-tietoja ei voi poistaa tästä.");
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      driver_number: "",
      phone: "",
      role: "driver",
    });
  };

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || "",
      driver_number: user.driver_number || "",
      phone: user.phone || "",
      role: user.role || "driver",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        userId: selectedUser.id,
        data: formData,
        newRole: formData.role,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Asetukset</h1>
          <p className="text-muted-foreground mt-1">
            Hallitse järjestelmän asetuksia
          </p>
        </div>

        {/* Admin User Management Section */}
        {isAdmin && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Käyttäjien hallinta</CardTitle>
                    <CardDescription>Hallitse käyttäjiä ja heidän roolejaan</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Ladataan...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Ei käyttäjiä</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nimi</TableHead>
                      <TableHead>Kuljettajanumero</TableHead>
                      <TableHead>Puhelin</TableHead>
                      <TableHead>Rooli</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || "Ei nimeä"}
                        </TableCell>
                        <TableCell>{user.driver_number || "—"}</TableCell>
                        <TableCell>{user.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge className={user.role ? roleColors[user.role] : ""}>
                            {user.role ? roleLabels[user.role] : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Poista käyttäjä?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Haluatko varmasti poistaa käyttäjän "{user.full_name}"? 
                                    Tämä poistaa käyttäjän profiilin ja roolin, mutta ei auth-tietoja.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Peruuta</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Profiili</CardTitle>
                  <CardDescription>Hallitse profiilitietojasi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tulossa pian: profiilitietojen muokkaus, salasanan vaihto.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Käyttöoikeudet</CardTitle>
                  <CardDescription>Roolien ja oikeuksien hallinta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isAdmin 
                  ? "Voit hallita käyttäjien rooleja yllä olevasta taulukosta." 
                  : "Ota yhteyttä ylläpitäjään muuttaaksesi käyttöoikeuksia."}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Varustelu</CardTitle>
                  <CardDescription>Dynaamisten attribuuttien hallinta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Hallitse ajoneuvojen varustelutietoja, kuten inva-hissi, paarivarustus, porraskiipijä.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/varustelu")}>
                Siirry varusteluun
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Ilmoitukset</CardTitle>
                  <CardDescription>Sähköposti- ja push-ilmoitukset</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tulossa pian: ilmoitusasetukset huolloista, ajokorttien vanhentumisesta.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Järjestelmä</CardTitle>
                  <CardDescription>Yleiset järjestelmäasetukset</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tulossa pian: yrityksen tiedot, laskutusasetukset, API-integraatiot.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Edit User Dialog */}
        <Dialog
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Muokkaa käyttäjää: {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nimi</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="driver_number">Kuljettajanumero</Label>
                  <Input
                    id="driver_number"
                    value={formData.driver_number}
                    onChange={(e) => setFormData({ ...formData, driver_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Puhelin</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Rooli</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Ylläpitäjä</SelectItem>
                    <SelectItem value="manager">Yrittäjä</SelectItem>
                    <SelectItem value="driver">Kuljettaja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    resetForm();
                  }}
                >
                  Peruuta
                </Button>
                <Button type="submit">Tallenna</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
