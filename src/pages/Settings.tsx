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
  DialogTrigger,
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
import { Shield, Tag, Users, Edit2, Trash2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { DataImportExport } from "@/components/settings/DataImportExport";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";

type AppRole = "system_admin" | "contract_manager" | "hardware_ops" | "support";

interface UserProfile {
  id: string;
  full_name: string | null;
  driver_number: string | null;
  phone: string | null;
  email?: string;
  role?: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  system_admin: "Pääkäyttäjä (IT)",
  contract_manager: "Sopimushallinta",
  hardware_ops: "Laitehallinta",
  support: "Asiakaspalvelu",
};

const roleDescriptions: Record<AppRole, string> = {
  system_admin: "Täydet oikeudet kaikkeen",
  contract_manager: "Yritys- ja autotietojen muokkaus",
  hardware_ops: "Laitteiden hallinta, sopimukset vain luku",
  support: "Vain lukuoikeus kaikkeen",
};

const roleColors: Record<AppRole, string> = {
  system_admin: "bg-destructive text-destructive-foreground",
  contract_manager: "bg-primary text-primary-foreground",
  hardware_ops: "bg-status-maintenance text-status-maintenance-foreground",
  support: "bg-muted text-muted-foreground",
};

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    driver_number: "",
    phone: "",
    role: "support" as AppRole,
  });
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "support" as AppRole,
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
        setIsAdmin(data?.role === "system_admin");
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
        role: rolesMap.get(p.id) || "support",
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

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUserData) => {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error("Käyttäjän luonti epäonnistui");

      // Update the user's role (profile is created automatically by trigger)
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: data.role })
        .eq("user_id", authData.user.id);
      
      if (roleError) {
        console.error("Role update error:", roleError);
        // Role might not exist yet if trigger hasn't run, try insert
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: data.role });
        if (insertError) throw insertError;
      }

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Käyttäjä luotu onnistuneesti! Käyttäjä saa sähköpostin tunnuksistaan.");
      setIsAddUserDialogOpen(false);
      setNewUserData({ email: "", password: "", full_name: "", role: "support" });
    },
    onError: (error: any) => {
      console.error("Create user error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Tämä sähköpostiosoite on jo käytössä");
      } else {
        toast.error("Virhe luotaessa käyttäjää: " + error.message);
      }
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
      toast.error("Virhe poistettaessa käyttäjää");
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      driver_number: "",
      phone: "",
      role: "support",
    });
  };

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || "",
      driver_number: user.driver_number || "",
      phone: user.phone || "",
      role: (user.role as AppRole) || "support",
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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password || !newUserData.full_name) {
      toast.error("Täytä kaikki pakolliset kentät");
      return;
    }
    if (newUserData.password.length < 6) {
      toast.error("Salasanan tulee olla vähintään 6 merkkiä");
      return;
    }
    createUserMutation.mutate(newUserData);
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
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Lisää käyttäjä
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Lisää uusi käyttäjä</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label htmlFor="new-email">Sähköposti *</Label>
                        <Input
                          id="new-email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          placeholder="nimi@lahitaksi.fi"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">Salasana *</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          placeholder="Vähintään 6 merkkiä"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-name">Nimi *</Label>
                        <Input
                          id="new-name"
                          value={newUserData.full_name}
                          onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                          placeholder="Matti Meikäläinen"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-role">Rooli</Label>
                        <Select
                          value={newUserData.role}
                          onValueChange={(value: AppRole) => setNewUserData({ ...newUserData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system_admin">
                              <div className="flex flex-col">
                                <span>Pääkäyttäjä (IT)</span>
                                <span className="text-xs text-muted-foreground">Täydet oikeudet</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="contract_manager">
                              <div className="flex flex-col">
                                <span>Sopimushallinta</span>
                                <span className="text-xs text-muted-foreground">Yritys- ja autotiedot</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="hardware_ops">
                              <div className="flex flex-col">
                                <span>Laitehallinta</span>
                                <span className="text-xs text-muted-foreground">Laitteet, sopimukset luku</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="support">
                              <div className="flex flex-col">
                                <span>Asiakaspalvelu</span>
                                <span className="text-xs text-muted-foreground">Vain lukuoikeus</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserDialogOpen(false)}
                        >
                          Peruuta
                        </Button>
                        <Button type="submit" disabled={createUserMutation.isPending}>
                          {createUserMutation.isPending ? "Luodaan..." : "Luo käyttäjä"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Role explanations */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Roolit ja oikeudet:</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                    <div key={role} className="flex items-start gap-2">
                      <Badge className={roleColors[role]}>{roleLabels[role]}</Badge>
                      <span className="text-xs text-muted-foreground">{roleDescriptions[role]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Ladataan...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Ei käyttäjiä</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nimi</TableHead>
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
                        <TableCell>{user.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge className={user.role ? roleColors[user.role as AppRole] : ""}>
                            {user.role ? roleLabels[user.role as AppRole] : "—"}
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
          {/* Profile Settings */}
          <ProfileSettings />

          {/* Access Rights Card */}
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
                  : "Ota yhteyttä pääkäyttäjään muuttaaksesi käyttöoikeuksia."}
              </p>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <NotificationSettings />

          {/* Equipment Management (Admin only) */}
          {isAdmin && (
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
          )}

          {/* System Settings */}
          <SystemSettings isAdmin={isAdmin} />

          {/* Data Import/Export */}
          <DataImportExport isAdmin={isAdmin} />

          {/* Audit Log Viewer */}
          <AuditLogViewer isAdmin={isAdmin} />
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
                    <SelectItem value="system_admin">Pääkäyttäjä (IT)</SelectItem>
                    <SelectItem value="contract_manager">Sopimushallinta</SelectItem>
                    <SelectItem value="hardware_ops">Laitehallinta</SelectItem>
                    <SelectItem value="support">Asiakaspalvelu</SelectItem>
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
