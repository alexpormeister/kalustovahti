import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tag, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Attribute {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  vehicle_count?: number;
}

export default function Equipment() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["equipment-attributes"],
    queryFn: async () => {
      const { data: attrs, error } = await supabase
        .from("vehicle_attributes")
        .select("*")
        .order("name");
      if (error) throw error;

      // Get vehicle counts for each attribute
      const { data: links } = await supabase
        .from("vehicle_attribute_links")
        .select("attribute_id");

      const countMap = new Map<string, number>();
      links?.forEach((link: any) => {
        countMap.set(link.attribute_id, (countMap.get(link.attribute_id) || 0) + 1);
      });

      return attrs.map((attr: any) => ({
        ...attr,
        vehicle_count: countMap.get(attr.id) || 0,
      })) as Attribute[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("vehicle_attributes").insert([{
        name: data.name,
        description: data.description || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-attributes"] });
      toast.success("Varustelu lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Virhe lisättäessä varustelua");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("vehicle_attributes")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-attributes"] });
      toast.success("Varustelu päivitetty onnistuneesti");
      setSelectedAttribute(null);
      resetForm();
    },
    onError: () => {
      toast.error("Virhe päivitettäessä varustelua");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_attributes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-attributes"] });
      toast.success("Varustelu poistettu onnistuneesti");
    },
    onError: () => {
      toast.error("Virhe poistettaessa varustelua");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleEdit = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setFormData({
      name: attribute.name,
      description: attribute.description || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAttribute) {
      updateMutation.mutate({ id: selectedAttribute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Common equipment presets
  const presets = [
    { name: "Inva-hissi", description: "Pyörätuolihissi" },
    { name: "Paarikuljetus", description: "Paarivarustus" },
    { name: "Porraskiipijä", description: "Porraskiipijävarustus" },
    { name: "Sähköauto", description: "Täyssähköauto" },
    { name: "Hybridi", description: "Hybridiauto" },
    { name: "Koulukyyti", description: "Koulukuljetusvarustus" },
    { name: "Ruotsinkielinen kuljettaja", description: "Kuljettaja puhuu ruotsia" },
    { name: "Englanninkielinen kuljettaja", description: "Kuljettaja puhuu englantia" },
    { name: "Lastensistuimia", description: "Lasten turvaistuimet" },
    { name: "Tilataksi", description: "7+ hengen ajoneuvo" },
  ];

  const addPreset = (preset: { name: string; description: string }) => {
    createMutation.mutate({
      name: preset.name,
      description: preset.description,
    });
  };

  const AttributeForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nimi *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="esim. Inva-hissi"
        />
      </div>
      <div>
        <Label htmlFor="description">Kuvaus</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Varustelun tarkempi kuvaus..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsAddDialogOpen(false);
            setSelectedAttribute(null);
            resetForm();
          }}
        >
          Peruuta
        </Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Varustelu</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse ajoneuvojen varustelutietoja ja ominaisuuksia
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Lisää varustelu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Lisää uusi varustelu</DialogTitle>
              </DialogHeader>
              <AttributeForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Add Presets */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pikavalintoja</CardTitle>
            <CardDescription>
              Klikkaa lisätäksesi yleisiä varustelutyyppejä
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {presets
                .filter((preset) => !attributes.some((a) => a.name === preset.name))
                .map((preset) => (
                  <Badge
                    key={preset.name}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => addPreset(preset)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {preset.name}
                  </Badge>
                ))}
              {presets.filter((preset) => !attributes.some((a) => a.name === preset.name)).length === 0 && (
                <p className="text-sm text-muted-foreground">Kaikki pikavalinnat on jo lisätty</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attributes Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Varustelutyypit ({attributes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ladataan...
              </div>
            ) : attributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ei varustelutietoja. Lisää uusia yllä olevista pikavalinnosta tai "Lisää varustelu" -painikkeella.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nimi</TableHead>
                    <TableHead>Kuvaus</TableHead>
                    <TableHead>Autoja</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributes.map((attribute) => (
                    <TableRow key={attribute.id}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">{attribute.name}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {attribute.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{attribute.vehicle_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(attribute)}
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
                                <AlertDialogTitle>
                                  Poista varustelu?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Haluatko varmasti poistaa varustelun "{attribute.name}"? 
                                  {attribute.vehicle_count > 0 && (
                                    <span className="block mt-2 font-medium text-destructive">
                                      Varustelu on liitetty {attribute.vehicle_count} ajoneuvoon.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Peruuta</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(attribute.id)}
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

        {/* Edit Dialog */}
        <Dialog
          open={!!selectedAttribute}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAttribute(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Muokkaa varustelua: {selectedAttribute?.name}</DialogTitle>
            </DialogHeader>
            <AttributeForm />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
