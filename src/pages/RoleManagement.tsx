import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
}

interface PagePermission {
  id: string;
  role_id: string;
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
}

const pageLabels: Record<string, string> = {
  dashboard: "Hallintapaneeli",
  autoilijat: "Autoilijat",
  dokumentit: "Dokumentit",
  kalusto: "Autot",
  laitteet: "Laitevarasto",
  kuljettajat: "Kuljettajat",
  varustelu: "Attribuutit",
  laadunvalvonta: "Laadunvalvonta",
  asetukset: "Asetukset",
  kayttajat: "Käyttäjät",
};

const allPages = Object.keys(pageLabels);

export default function RoleManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSystemAdmin, isLoading: permLoading } = usePermissions();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!permLoading && !isSystemAdmin) {
      navigate("/dashboard");
      toast.error("Sinulla ei ole oikeuksia tähän sivuun");
    }
  }, [isSystemAdmin, permLoading, navigate]);

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("is_system_role", { ascending: false })
        .order("display_name");
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: isSystemAdmin,
  });

  // Fetch permissions for all roles
  const { data: allPermissions = [] } = useQuery({
    queryKey: ["role-page-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_page_permissions")
        .select("*");
      
      if (error) throw error;
      return data as PagePermission[];
    },
    enabled: isSystemAdmin,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create the role
      const { data: newRole, error: roleError } = await supabase
        .from("roles")
        .insert([{
          name: data.name.toLowerCase().replace(/\s+/g, "_"),
          display_name: data.display_name,
          description: data.description || null,
          is_system_role: false,
        }])
        .select()
        .single();

      if (roleError) throw roleError;

      // Create default permissions (all false)
      const permissions = allPages.map(page => ({
        role_id: newRole.id,
        page_key: page,
        can_view: false,
        can_edit: false,
      }));

      const { error: permError } = await supabase
        .from("role_page_permissions")
        .insert(permissions);

      if (permError) throw permError;

      return newRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-page-permissions"] });
      toast.success("Rooli luotu onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("roles")
        .update({
          display_name: data.display_name,
          description: data.description || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Rooli päivitetty");
      setSelectedRole(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-page-permissions"] });
      toast.success("Rooli poistettu");
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      roleId,
      pageKey,
      canView,
      canEdit,
    }: {
      roleId: string;
      pageKey: string;
      canView: boolean;
      canEdit: boolean;
    }) => {
      const { error } = await supabase
        .from("role_page_permissions")
        .update({ can_view: canView, can_edit: canEdit })
        .eq("role_id", roleId)
        .eq("page_key", pageKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-page-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-all"] });
    },
    onError: (error: any) => {
      toast.error("Virhe: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", display_name: "", description: "" });
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const getPermissionForRole = (roleId: string, pageKey: string): PagePermission | undefined => {
    return allPermissions.find(p => p.role_id === roleId && p.page_key === pageKey);
  };

  const handlePermissionChange = (
    roleId: string,
    pageKey: string,
    type: "view" | "edit",
    value: boolean
  ) => {
    const current = getPermissionForRole(roleId, pageKey);
    if (!current) return;

    let newCanView = current.can_view;
    let newCanEdit = current.can_edit;

    if (type === "view") {
      newCanView = value;
      // If removing view, also remove edit
      if (!value) newCanEdit = false;
    } else {
      newCanEdit = value;
      // If adding edit, also add view
      if (value) newCanView = true;
    }

    updatePermissionMutation.mutate({
      roleId,
      pageKey,
      canView: newCanView,
      canEdit: newCanEdit,
    });
  };

  if (permLoading || !isSystemAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ladataan...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Roolien hallinta</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse käyttäjärooleja ja niiden oikeuksia
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Luo uusi rooli
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Luo uusi rooli</DialogTitle>
                <DialogDescription>
                  Määritä roolin nimi ja kuvaus. Oikeudet voit määrittää luomisen jälkeen.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Roolin nimi *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Esim. Taloushallinto"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tekninen nimi *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Esim. finance_admin"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Käytetään järjestelmässä. Vain pieniä kirjaimia ja alaviivoja.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Kuvaus</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Roolin tehtävä ja vastuualueet..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Peruuta
                  </Button>
                  <Button type="submit" disabled={createRoleMutation.isPending}>
                    {createRoleMutation.isPending ? "Luodaan..." : "Luo rooli"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog
          open={!!selectedRole}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRole(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Muokkaa roolia</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit_display_name">Roolin nimi *</Label>
                <Input
                  id="edit_display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Kuvaus</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setSelectedRole(null)}>
                  Peruuta
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? "Tallennetaan..." : "Tallenna"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roolit</TabsTrigger>
            <TabsTrigger value="permissions">Oikeudet</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p className="text-muted-foreground">Ladataan...</p>
              ) : (
                roles.map((role) => (
                  <Card key={role.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{role.display_name}</CardTitle>
                        </div>
                        {role.is_system_role && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Järjestelmä
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{role.description || "Ei kuvausta"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleEdit(role)}
                        >
                          <Pencil className="h-3 w-3" />
                          Muokkaa
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Haluatko varmasti poistaa tämän roolin?")) {
                                deleteRoleMutation.mutate(role.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                            Poista
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sivukohtaiset oikeudet</CardTitle>
                <CardDescription>
                  Määritä mitä kukin rooli voi nähdä ja muokata. Pääkäyttäjällä on aina täydet oikeudet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="font-semibold text-foreground min-w-[150px]">Sivu</TableHead>
                        {roles
                          .filter(r => !r.is_system_role || r.name !== "system_admin")
                          .map((role) => (
                            <TableHead key={role.id} className="text-center min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold text-foreground">{role.display_name}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  Näkee / Muokkaa
                                </span>
                              </div>
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPages.map((pageKey) => (
                        <TableRow key={pageKey} className="border-border">
                          <TableCell className="font-medium">{pageLabels[pageKey]}</TableCell>
                          {roles
                            .filter(r => !r.is_system_role || r.name !== "system_admin")
                            .map((role) => {
                              const perm = getPermissionForRole(role.id, pageKey);
                              const isSystemAdmin = role.name === "system_admin";
                              
                              return (
                                <TableCell key={role.id} className="text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <Switch
                                      checked={isSystemAdmin || perm?.can_view || false}
                                      disabled={isSystemAdmin}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(role.id, pageKey, "view", checked)
                                      }
                                    />
                                    <Switch
                                      checked={isSystemAdmin || perm?.can_edit || false}
                                      disabled={isSystemAdmin}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(role.id, pageKey, "edit", checked)
                                      }
                                    />
                                  </div>
                                </TableCell>
                              );
                            })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
