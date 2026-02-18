import { useState, useRef } from "react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const scopeLabels: Record<string, string> = { all: "Kaikki", company: "Yritys", driver: "Kuljettaja" };

export function SharedAttachmentManager() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ name: "", description: "", scope: "all" });

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["shared-attachments-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_attachments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { formData: typeof formData; file: File }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Kirjautuminen vaaditaan");
      const filePath = `${Date.now()}_${data.file.name}`;
      const { error: uploadError } = await supabase.storage.from("shared-attachments").upload(filePath, data.file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("shared_attachments").insert([{
        name: data.formData.name,
        description: data.formData.description || null,
        file_name: data.file.name,
        file_path: filePath,
        file_type: data.file.name.split(".").pop() || "pdf",
        scope: data.formData.scope,
        uploaded_by: user.user.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-attachments-admin"] });
      toast.success("Liite lisätty");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("shared_attachments")
        .update({ name: data.name, description: data.description || null, scope: data.scope })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-attachments-admin"] });
      toast.success("Liite päivitetty");
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (att: any) => {
      await supabase.storage.from("shared-attachments").remove([att.file_path]);
      const { error } = await supabase.from("shared_attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-attachments-admin"] });
      toast.success("Liite poistettu");
    },
    onError: (e: any) => toast.error("Virhe: " + e.message),
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", scope: "all" });
    setSelectedFile(null);
  };

  const handleEdit = (att: any) => {
    setEditing(att);
    setFormData({ name: att.name, description: att.description || "", scope: att.scope || "all" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      if (!selectedFile) { toast.error("Valitse tiedosto"); return; }
      createMutation.mutate({ formData, file: selectedFile });
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nimi *</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="esim. Yleiset sopimusehdot" required />
      </div>
      <div>
        <Label>Kuvaus</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Liitteen kuvaus..." rows={2} />
      </div>
      <div>
        <Label>Kohde</Label>
        <Select value={formData.scope} onValueChange={(v) => setFormData({ ...formData, scope: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki</SelectItem>
            <SelectItem value="company">Yritys</SelectItem>
            <SelectItem value="driver">Kuljettaja</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!editing && (
        <div>
          <Label>Tiedosto *</Label>
          <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} ref={fileInputRef} />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditing(null); resetForm(); }}>Peruuta</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Ladataan..." : "Tallenna"}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={resetForm}><Plus className="h-4 w-4" />Lisää liite</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lisää jaettu liite</DialogTitle></DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-4">Ladataan...</p>
      ) : attachments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Ei liitteitä</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nimi</TableHead>
              <TableHead>Tiedosto</TableHead>
              <TableHead>Kohde</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments.map((att: any) => (
              <TableRow key={att.id}>
                <TableCell className="font-medium">{att.name}</TableCell>
                <TableCell className="text-muted-foreground">{att.file_name}</TableCell>
                <TableCell><Badge variant="outline">{scopeLabels[att.scope] || att.scope}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(att)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Poista liite?</AlertDialogTitle>
                          <AlertDialogDescription>Haluatko varmasti poistaa liitteen "{att.name}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Peruuta</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(att)} className="bg-destructive text-destructive-foreground">Poista</AlertDialogAction>
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

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Muokkaa liitettä</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}
