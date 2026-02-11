import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  validity_period_months: number | null;
  scope: string;
}

export function DocumentTypeManager() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_required: false,
    validity_period_months: "",
    scope: "company",
  });

  const { data: docTypes = [], isLoading } = useQuery({
    queryKey: ["document-types-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DocumentType[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("document_types").insert([{
        name: data.name,
        description: data.description || null,
        is_required: data.is_required,
        validity_period_months: data.validity_period_months ? parseInt(data.validity_period_months) : null,
        scope: data.scope,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types-admin"] });
      toast.success("Dokumenttityyppi lisätty");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("document_types")
        .update({
          name: data.name,
          description: data.description || null,
          is_required: data.is_required,
          validity_period_months: data.validity_period_months ? parseInt(data.validity_period_months) : null,
          scope: data.scope,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types-admin"] });
      toast.success("Dokumenttityyppi päivitetty");
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types-admin"] });
      toast.success("Dokumenttityyppi poistettu");
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", is_required: false, validity_period_months: "", scope: "company" });
  };

  const handleEdit = (dt: DocumentType) => {
    setEditing(dt);
    setFormData({
      name: dt.name,
      description: dt.description || "",
      is_required: dt.is_required,
      validity_period_months: dt.validity_period_months?.toString() || "",
      scope: dt.scope || "company",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nimi *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="esim. Vastuuvakuutus"
          required
        />
      </div>
      <div>
        <Label>Kuvaus</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Dokumentin kuvaus..."
          rows={2}
        />
      </div>
      <div>
        <Label>Kohde</Label>
        <Select value={formData.scope} onValueChange={(v) => setFormData({ ...formData, scope: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="company">Yritys</SelectItem>
            <SelectItem value="driver">Kuljettaja</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_required}
          onCheckedChange={(v) => setFormData({ ...formData, is_required: v })}
        />
        <Label>Pakollinen dokumentti</Label>
      </div>
      <div>
        <Label>Voimassaoloaika (kk)</Label>
        <Input
          type="number"
          value={formData.validity_period_months}
          onChange={(e) => setFormData({ ...formData, validity_period_months: e.target.value })}
          placeholder="esim. 12"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditing(null); resetForm(); }}>
          Peruuta
        </Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  const companyTypes = docTypes.filter((dt) => dt.scope === "company" || !dt.scope);
  const driverTypes = docTypes.filter((dt) => dt.scope === "driver");

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dokumenttityypit
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Lisää
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Lisää dokumenttityyppi</DialogTitle></DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Ladataan...</p>
        ) : (
          <>
            {companyTypes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Yritys-dokumentit</h4>
                <DocTypeTable types={companyTypes} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
              </div>
            )}
            {driverTypes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Kuljettaja-dokumentit</h4>
                <DocTypeTable types={driverTypes} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Muokkaa dokumenttityyppiä</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DocTypeTable({ types, onEdit, onDelete }: { types: any[]; onEdit: (dt: any) => void; onDelete: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nimi</TableHead>
          <TableHead>Pakollinen</TableHead>
          <TableHead>Voimassaolo</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {types.map((dt) => (
          <TableRow key={dt.id}>
            <TableCell className="font-medium">{dt.name}</TableCell>
            <TableCell>
              {dt.is_required ? (
                <Badge className="bg-primary text-primary-foreground">Kyllä</Badge>
              ) : (
                <Badge variant="outline">Ei</Badge>
              )}
            </TableCell>
            <TableCell>
              {dt.validity_period_months ? `${dt.validity_period_months} kk` : "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(dt)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Poista dokumenttityyppi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Haluatko varmasti poistaa dokumenttityypin "{dt.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Peruuta</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(dt.id)} className="bg-destructive text-destructive-foreground">
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
  );
}
