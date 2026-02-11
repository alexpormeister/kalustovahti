import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Plus, Trash2, Edit2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Attribute {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  link_count?: number;
}

function AttributeSection({
  title,
  icon: Icon,
  tableName,
  linkTableName,
  queryKey,
  entityLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tableName: string;
  linkTableName: string;
  queryKey: string;
  entityLabel: string;
}) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data: attrs, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("name");
      if (error) throw error;

      const { data: links } = await supabase
        .from(linkTableName as any)
        .select("attribute_id");

      const countMap = new Map<string, number>();
      (links as any[])?.forEach((link) => {
        countMap.set(link.attribute_id, (countMap.get(link.attribute_id) || 0) + 1);
      });

      return (attrs as any[]).map((attr) => ({
        ...attr,
        link_count: countMap.get(attr.id) || 0,
      })) as Attribute[];
    },
  });

  const filteredAttributes = attributes.filter((attr) =>
    attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attr.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from(tableName as any).insert([{
        name: data.name,
        description: data.description || null,
      }] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Attribuutti lisätty");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Virhe lisättäessä attribuuttia"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ name: data.name, description: data.description || null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Attribuutti päivitetty");
      setSelectedAttribute(null);
      resetForm();
    },
    onError: () => toast.error("Virhe päivitettäessä attribuuttia"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Attribuutti poistettu");
    },
    onError: () => toast.error("Virhe poistettaessa attribuuttia"),
  });

  const resetForm = () => setFormData({ name: "", description: "" });

  const handleEdit = (attr: Attribute) => {
    setSelectedAttribute(attr);
    setFormData({ name: attr.name, description: attr.description || "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAttribute) {
      updateMutation.mutate({ id: selectedAttribute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`${queryKey}-name`}>Nimi *</Label>
        <Input
          id={`${queryKey}-name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="esim. Inva-hissi"
        />
      </div>
      <div>
        <Label htmlFor={`${queryKey}-desc`}>Kuvaus</Label>
        <Textarea
          id={`${queryKey}-desc`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Attribuutin tarkempi kuvaus..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedAttribute(null); resetForm(); }}>
          Peruuta
        </Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
            {formContent}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Hae attribuutteja..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title} ({filteredAttributes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
          ) : filteredAttributes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Ei hakutuloksia" : "Ei attribuutteja."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kuvaus</TableHead>
                  <TableHead>{entityLabel}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.map((attr) => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">
                      <Badge variant="secondary">{attr.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{attr.description || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{attr.link_count}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(attr)}>
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
                              <AlertDialogTitle>Poista attribuutti?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Haluatko varmasti poistaa attribuutin "{attr.name}"?
                                {(attr.link_count || 0) > 0 && (
                                  <span className="block mt-2 font-medium text-destructive">
                                    Attribuutti on liitetty {attr.link_count} kohteeseen.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Peruuta</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(attr.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

      <Dialog open={!!selectedAttribute} onOpenChange={(open) => { if (!open) { setSelectedAttribute(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Muokkaa attribuuttia: {selectedAttribute?.name}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AttributeManager() {
  return (
    <Tabs defaultValue="vehicle" className="space-y-4">
      <TabsList>
        <TabsTrigger value="vehicle" className="gap-2">
          <Tag className="h-4 w-4" />
          Ajoneuvo-attribuutit
        </TabsTrigger>
        <TabsTrigger value="driver" className="gap-2">
          <Users className="h-4 w-4" />
          Kuljettaja-attribuutit
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vehicle">
        <AttributeSection
          title="Ajoneuvo-attribuutit"
          icon={Tag}
          tableName="vehicle_attributes"
          linkTableName="vehicle_attribute_links"
          queryKey="vehicle-attributes-admin"
          entityLabel="Autoja"
        />
      </TabsContent>

      <TabsContent value="driver">
        <AttributeSection
          title="Kuljettaja-attribuutit"
          icon={Users}
          tableName="driver_attributes"
          linkTableName="driver_attribute_links"
          queryKey="driver-attributes-admin"
          entityLabel="Kuljettajia"
        />
      </TabsContent>
    </Tabs>
  );
}
