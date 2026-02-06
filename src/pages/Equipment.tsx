import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tag, Plus, Trash2, Edit2, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredAttributes = attributes.filter((attr) =>
    attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attr.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      toast.success("Attribuutti lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Virhe lisättäessä attribuuttia");
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
      toast.success("Attribuutti päivitetty onnistuneesti");
      setSelectedAttribute(null);
      resetForm();
    },
    onError: () => {
      toast.error("Virhe päivitettäessä attribuuttia");
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
      toast.success("Attribuutti poistettu onnistuneesti");
    },
    onError: () => {
      toast.error("Virhe poistettaessa attribuuttia");
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
          placeholder="Attribuutin tarkempi kuvaus..."
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
            <h1 className="text-3xl font-bold text-foreground">Attribuutit</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse ajoneuvojen attribuutteja ja ominaisuuksia
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Lisää attribuutti
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Lisää uusi attribuutti</DialogTitle>
              </DialogHeader>
              <AttributeForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hae attribuutteja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Attributes Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Attribuutit ({filteredAttributes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ladataan...
              </div>
            ) : filteredAttributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Ei hakutuloksia" : "Ei attribuutteja. Lisää uusia \"Lisää attribuutti\" -painikkeella."}
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
                  {filteredAttributes.map((attribute) => (
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
                                  Poista attribuutti?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Haluatko varmasti poistaa attribuutin "{attribute.name}"? 
                                  {attribute.vehicle_count! > 0 && (
                                    <span className="block mt-2 font-medium text-destructive">
                                      Attribuutti on liitetty {attribute.vehicle_count} ajoneuvoon.
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
              <DialogTitle>Muokkaa attribuuttia: {selectedAttribute?.name}</DialogTitle>
            </DialogHeader>
            <AttributeForm />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
