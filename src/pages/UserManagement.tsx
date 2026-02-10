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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, Edit2, Trash2, UserPlus, Search, ChevronDown, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fi } from "date-fns/locale";

type AppRole = string;

interface UserProfile {
  id: string;
  full_name: string | null;
  driver_number: string | null;
  phone: string | null;
  email?: string;
  role?: AppRole;
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  description: string | null;
  created_at: string;
}

const defaultRoleLabels: Record<string, string> = {
  system_admin: "Pääkäyttäjä (IT)",
  contract_manager: "Sopimushallinta",
  hardware_ops: "Laitehallinta",
  support: "Asiakaspalvelu",
};

const defaultRoleDescriptions: Record<string, string> = {
  system_admin: "Täydet oikeudet kaikkeen",
  contract_manager: "Yritys- ja autotietojen muokkaus",
  hardware_ops: "Laitteiden hallinta, sopimukset vain luku",
  support: "Vain lukuoikeus kaikkeen",
};

const defaultRoleColors: Record<string, string> = {
  system_admin: "bg-destructive text-destructive-foreground",
  contract_manager: "bg-primary text-primary-foreground",
  hardware_ops: "bg-status-maintenance text-status-maintenance-foreground",
  support: "bg-muted text-muted-foreground",
};

const actionLabels: Record<string, string> = {
  create: "Luonti",
  update: "Muokkaus",
  delete: "Poisto",
};

const actionColors: Record<string, string> = {
  create: "bg-status-active text-status-active-foreground",
  update: "bg-primary text-primary-foreground",
  delete: "bg-destructive text-destructive-foreground",
};

export default function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
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

  // Fetch available roles from the roles table
  const { data: dbRoles = [] } = useQuery({
    queryKey: ["available-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("name, display_name")
        .order("display_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Build dynamic role labels and colors
  const roleLabels: Record<string, string> = {};
  const roleColors: Record<string, string> = {};
  const roleDescriptions: Record<string, string> = {};
  
  dbRoles.forEach((r) => {
    roleLabels[r.name] = r.display_name;
    roleColors[r.name] = defaultRoleColors[r.name] || "bg-secondary text-secondary-foreground";
    roleDescriptions[r.name] = defaultRoleDescriptions[r.name] || r.display_name;
  });
  // Ensure defaults exist
  Object.entries(defaultRoleLabels).forEach(([key, val]) => {
    if (!roleLabels[key]) roleLabels[key] = val;
    if (!roleColors[key]) roleColors[key] = defaultRoleColors[key] || "bg-secondary text-secondary-foreground";
    if (!roleDescriptions[key]) roleDescriptions[key] = defaultRoleDescriptions[key] || val;
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
        const admin = data?.role === "system_admin";
        setIsAdmin(admin);
        if (!admin) {
          navigate("/asetukset");
          toast.error("Ei käyttöoikeutta");
        }
      } else {
        navigate("/auth");
      }
    };
    checkAdmin();
  }, [navigate]);

  // Fetch all users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map((r: any) => [r.user_id, r.role]));

      return profiles.map((p: any) => ({
        ...p,
        role: rolesMap.get(p.id) || "support",
      })) as UserProfile[];
    },
    enabled: isAdmin,
  });

  // Fetch user-specific audit logs
  const { data: userLogs = [] } = useQuery({
    queryKey: ["user-audit-logs", expandedUserId],
    queryFn: async () => {
      if (!expandedUserId) return [];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", expandedUserId)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!expandedUserId,
  });

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.driver_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data, newRole }: { userId: string; data: any; newRole: AppRole }) => {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          driver_number: data.driver_number || null,
          phone: data.phone || null,
        })
        .eq("id", userId);
      
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: newRole } as any)
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

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: data.role } as any)
        .eq("user_id", authData.user.id);
      
      if (roleError) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: data.role } as any);
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
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      if (roleError) throw roleError;

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

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach((key) => {
      if (key === "updated_at" || key === "created_at") return;
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    });
    return changes;
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Käyttäjien hallinta</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse käyttäjiä, rooleja ja tarkastele käyttäjäkohtaisia lokeja
            </p>
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
                    placeholder="nimi@kalustovahti.fi"
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
                      {Object.entries(roleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hae nimellä, puhelinnumerolla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role explanations */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Roolit ja oikeudet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                <div key={role} className="flex items-start gap-2">
                  <Badge className={roleColors[role]}>{roleLabels[role]}</Badge>
                  <span className="text-xs text-muted-foreground">{roleDescriptions[role]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Käyttäjät ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Ladataan...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {searchQuery ? "Ei hakutuloksia" : "Ei käyttäjiä"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <Collapsible
                    key={user.id}
                    open={expandedUserId === user.id}
                    onOpenChange={(open) => setExpandedUserId(open ? user.id : null)}
                  >
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{user.full_name || "Ei nimeä"}</p>
                            <p className="text-sm text-muted-foreground">{user.phone || "—"}</p>
                          </div>
                          <Badge className={user.role ? roleColors[user.role as AppRole] : ""}>
                            {user.role ? roleLabels[user.role as AppRole] : "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
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
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedUserId === user.id ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="border-t p-4 bg-muted/30">
                          <div className="flex items-center gap-2 mb-3">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">Käyttäjän lokit</h4>
                          </div>
                          {userLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Ei lokeja</p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {userLogs.map((log) => {
                                const changes = getChangedFields(log.old_data, log.new_data);
                                return (
                                  <div key={log.id} className="p-3 bg-background rounded-lg border text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className={actionColors[log.action] || "bg-muted"}>
                                        {actionLabels[log.action] || log.action}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {log.table_name} • {format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}
                                      </span>
                                    </div>
                                    {changes.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {changes.slice(0, 3).map((change, i) => (
                                          <div key={i} className="text-xs">
                                            <span className="font-medium">{change.field}:</span>{" "}
                                            <span className="text-destructive line-through">
                                              {JSON.stringify(change.oldValue) || "—"}
                                            </span>{" "}
                                            →{" "}
                                            <span className="text-status-active">
                                              {JSON.stringify(change.newValue) || "—"}
                                            </span>
                                          </div>
                                        ))}
                                        {changes.length > 3 && (
                                          <p className="text-xs text-muted-foreground">
                                            +{changes.length - 3} muuta muutosta
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                      {Object.entries(roleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setSelectedUser(null); resetForm(); }}>
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
