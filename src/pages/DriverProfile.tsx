import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, User, FileText, Upload, Download, Eye, Calendar, History,
  Phone, Mail, MapPin, Trash2, Shield, EyeOff, Pencil, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, addDays } from "date-fns";
import { fi } from "date-fns/locale";

export default function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ document_type_id: "", valid_from: "", valid_until: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSSN, setShowSSN] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: driver, isLoading } = useQuery({
    queryKey: ["driver", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*, company:companies(name)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("name, province").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ["document-types-driver"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("*").eq("scope", "driver").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["driver-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_documents").select("*, document_type:document_types(*)").eq("driver_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: driverAttributes = [] } = useQuery({
    queryKey: ["driver-profile-attributes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_attribute_links").select("attribute:driver_attributes(id, name)").eq("driver_id", id);
      if (error) throw error;
      return data.map((l: any) => l.attribute);
    },
    enabled: !!id,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["driver-audit-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").eq("table_name", "drivers").eq("record_id", id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const updateData: any = {
        full_name: data.full_name,
        driver_number: data.driver_number,
        phone: data.phone || null,
        email: data.email || null,
        city: data.municipalities ? data.municipalities.join(", ") : null,
        province: null,
        company_id: data.company_id || null,
        status: data.status,
        notes: data.notes || null,
      };
      if (data.ssn_encrypted !== undefined) {
        updateData.ssn_encrypted = data.ssn_encrypted || null;
      }
      const { error } = await supabase.from("drivers").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", id] });
      toast.success("Kuljettaja päivitetty");
      setIsEditing(false);
    },
    onError: () => toast.error("Virhe päivitettäessä"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: typeof uploadData }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Kirjautuminen vaaditaan");
      const filePath = `${id}/${Date.now()}_${data.file.name}`;
      const { error: uploadError } = await supabase.storage.from("driver-documents").upload(filePath, data.file);
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("driver_documents").insert({
        driver_id: id, document_type_id: data.metadata.document_type_id,
        file_name: data.file.name, file_path: filePath,
        file_type: data.file.name.split(".").pop() || "pdf",
        valid_from: data.metadata.valid_from || null, valid_until: data.metadata.valid_until || null,
        notes: data.metadata.notes || null, uploaded_by: user.user.id,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-documents", id] });
      toast.success("Dokumentti ladattu");
      setIsUploadOpen(false); setSelectedFile(null);
      setUploadData({ document_type_id: "", valid_from: "", valid_until: "", notes: "" });
    },
    onError: () => toast.error("Virhe ladattaessa dokumenttia"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("driver-documents").remove([doc.file_path]);
      const { error } = await supabase.from("driver_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-documents", id] }); toast.success("Dokumentti poistettu"); },
    onError: () => toast.error("Virhe poistettaessa"),
  });

  const startEditing = () => {
    if (!driver) return;
    setEditForm({
      full_name: driver.full_name, driver_number: driver.driver_number,
      phone: driver.phone || "", email: driver.email || "",
      municipalities: driver.city ? driver.city.split(", ").filter(Boolean) : [],
      company_id: driver.company_id || "", status: driver.status,
      notes: driver.notes || "",
      ssn_encrypted: driver.ssn_encrypted || "",
    });
    setIsEditing(true);
  };

  const handleAddMunicipality = (name: string) => {
    if (name !== "none" && !editForm.municipalities?.includes(name)) {
      setEditForm({ ...editForm, municipalities: [...(editForm.municipalities || []), name] });
    }
  };

  const handleRemoveMunicipality = (name: string) => {
    setEditForm({ ...editForm, municipalities: (editForm.municipalities || []).filter((m: string) => m !== name) });
  };

  const handleRevealSSN = async () => {
    if (showSSN) { setShowSSN(false); return; }
    const { data: user } = await supabase.auth.getUser();
    if (user.user) await supabase.from("ssn_view_logs").insert({ driver_id: id, viewed_by: user.user.id } as any);
    setShowSSN(true);
    toast.info("HETU-tiedon katselu kirjattu lokiin");
  };

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from("driver-documents").download(doc.file_path);
    if (error) { toast.error("Virhe"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (doc: any) => {
    const { data, error } = await supabase.storage.from("driver-documents").createSignedUrl(doc.file_path, 3600);
    if (error) { toast.error("Virhe"); return; }
    setPreviewUrl(data.signedUrl); setIsPreviewOpen(true);
  };

  const getDocumentStatus = (doc: any) => {
    if (doc.valid_until && isBefore(new Date(doc.valid_until), new Date())) return "expired";
    if (doc.valid_until && isBefore(new Date(doc.valid_until), addDays(new Date(), 30))) return "expiring";
    return "active";
  };

  const maskSSN = (ssn: string | null) => {
    if (!ssn) return "—";
    return ssn.length >= 7 ? ssn.substring(0, 7) + "****" : "****";
  };

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    Object.keys({ ...oldData, ...newData }).forEach((key) => {
      if (key === "updated_at" || key === "created_at") return;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]))
        changes.push({ field: key, oldValue: oldData[key], newValue: newData[key] });
    });
    return changes;
  };

  const statusColors: Record<string, string> = {
    active: "bg-status-active text-status-active-foreground",
    expired: "bg-status-removed text-status-removed-foreground",
    expiring: "bg-status-maintenance text-status-maintenance-foreground",
  };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-96 text-muted-foreground">Ladataan...</div></DashboardLayout>;
  if (!driver) return <DashboardLayout><div className="flex flex-col items-center justify-center h-96 gap-4"><p className="text-muted-foreground">Kuljettajaa ei löytynyt</p><Button onClick={() => navigate("/kuljettajat")}><ArrowLeft className="h-4 w-4 mr-2" />Takaisin</Button></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kuljettajat")}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-3xl font-bold text-foreground">{driver.full_name}</h1><p className="text-muted-foreground">Kuljettaja #{driver.driver_number}</p></div>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="documents">Dokumentit ({documents.length})</TabsTrigger>
            <TabsTrigger value="attributes">Attribuutit</TabsTrigger>
            <TabsTrigger value="logs">Loki</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Kuljettajan tiedot</CardTitle>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={startEditing}><Pencil className="h-4 w-4 mr-1" />Muokkaa</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-1" />Peruuta</Button>
                      <Button size="sm" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />Tallenna</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <>
                    <div><Label>Nimi</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
                    <div><Label>Kuljettajanumero</Label><Input value={editForm.driver_number} onChange={(e) => setEditForm({ ...editForm, driver_number: e.target.value })} /></div>
                    <div><Label>Puhelin</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                    <div><Label>Sähköposti</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                    <div><Label>Kunnat</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(editForm.municipalities || []).map((m: string) => (
                          <Badge key={m} variant="secondary" className="gap-1">
                            {m}
                            <button type="button" className="ml-1 hover:text-destructive" onClick={() => handleRemoveMunicipality(m)}>×</button>
                          </Badge>
                        ))}
                      </div>
                      <Select value="none" onValueChange={handleAddMunicipality}>
                        <SelectTrigger><SelectValue placeholder="Lisää kunta" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Valitse kunta</SelectItem>
                          {municipalities.filter((m: any) => !(editForm.municipalities || []).includes(m.name)).map((m: any) => (
                            <SelectItem key={m.name} value={m.name}>{m.name}{m.province ? ` (${m.province})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Yritys</Label>
                      <Select value={editForm.company_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, company_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ei yritystä</SelectItem>
                          {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tila</Label>
                      <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktiivinen</SelectItem>
                          <SelectItem value="inactive">Ei-aktiivinen</SelectItem>
                          <SelectItem value="suspended">Estetty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2"><Label>Henkilötunnus (HETU)</Label><Input value={editForm.ssn_encrypted || ""} onChange={(e) => setEditForm({ ...editForm, ssn_encrypted: e.target.value })} placeholder="120190-123A" /></div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Puhelin</p><p className="font-medium">{driver.phone || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Sähköposti</p><p className="font-medium">{driver.email || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Kunnat</p><p className="font-medium">{driver.city || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Ammattiajon voimassaolo</p><p className="font-medium">{driver.driver_license_valid_until ? format(new Date(driver.driver_license_valid_until), "d.M.yyyy", { locale: fi }) : "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Henkilötunnus (HETU)</p><div className="flex items-center gap-2"><p className="font-medium font-mono">{showSSN ? (driver.ssn_encrypted || "—") : maskSSN(driver.ssn_encrypted)}</p>{driver.ssn_encrypted && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRevealSSN}>{showSSN ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>}</div></div></div>
                    <div><p className="text-sm text-muted-foreground">Yritys</p><p className="font-medium">{(driver as any).company?.name || "—"}</p></div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-end"><Button className="gap-2" onClick={() => setIsUploadOpen(true)}><Upload className="h-4 w-4" />Lataa dokumentti</Button></div>
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Kuljettajan dokumentit</CardTitle></CardHeader>
              <CardContent>
                {documents.length === 0 ? <div className="text-center py-8 text-muted-foreground">Ei dokumentteja</div> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tyyppi</TableHead><TableHead>Tiedosto</TableHead><TableHead>Voimassa</TableHead><TableHead>Tila</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => {
                        const status = getDocumentStatus(doc);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.document_type?.name || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.file_name}</TableCell>
                            <TableCell>{doc.valid_until ? format(new Date(doc.valid_until), "d.M.yyyy", { locale: fi }) : "—"}</TableCell>
                            <TableCell><Badge className={statusColors[status]}>{status === "active" ? "Voimassa" : status === "expiring" ? "Vanhenee pian" : "Vanhentunut"}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}><Download className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes">
            <Card className="glass-card">
              <CardHeader><CardTitle>Kuljettajan attribuutit</CardTitle></CardHeader>
              <CardContent>
                {driverAttributes.length === 0 ? <p className="text-muted-foreground text-center py-4">Ei attribuutteja</p> : (
                  <div className="flex flex-wrap gap-2">{driverAttributes.map((attr: any) => <Badge key={attr.id} variant="secondary">{attr.name}</Badge>)}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Muutoshistoria</CardTitle></CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? <p className="text-muted-foreground text-center py-4">Ei lokimerkintöjä</p> : (
                  <div className="space-y-2">
                    {auditLogs.map((log: any) => {
                      const changes = getChangedFields(log.old_data, log.new_data);
                      return (
                        <div key={log.id} className="p-3 bg-muted/30 rounded-lg border text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={log.action === "create" ? "bg-status-active text-status-active-foreground" : log.action === "delete" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
                              {log.action === "create" ? "Luonti" : log.action === "update" ? "Muokkaus" : "Poisto"}
                            </Badge>
                            <span className="text-muted-foreground">{format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}</span>
                          </div>
                          {changes.length > 0 && <div className="mt-2 space-y-1">{changes.slice(0, 5).map((c, i) => (
                            <div key={i} className="text-xs"><span className="font-medium">{c.field}:</span>{" "}<span className="text-destructive line-through">{JSON.stringify(c.oldValue) || "—"}</span>{" → "}<span className="text-status-active">{JSON.stringify(c.newValue) || "—"}</span></div>
                          ))}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Lataa kuljettajan dokumentti</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (!selectedFile || !uploadData.document_type_id) { toast.error("Valitse tiedosto ja dokumenttityyppi"); return; } uploadMutation.mutate({ file: selectedFile, metadata: uploadData }); }} className="space-y-4">
              <div><Label>Dokumenttityyppi *</Label>
                <Select value={uploadData.document_type_id} onValueChange={(v) => setUploadData({ ...uploadData, document_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
                  <SelectContent>{documentTypes.map((dt: any) => <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tiedosto (max 10MB) *</Label><Input ref={fileInputRef} type="file" accept=".pdf,.jpg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 10 * 1024 * 1024) { toast.error("Liian suuri"); return; } setSelectedFile(f || null); }} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Voimassa alkaen</Label><Input type="date" value={uploadData.valid_from} onChange={(e) => setUploadData({ ...uploadData, valid_from: e.target.value })} /></div>
                <div><Label>Voimassa saakka</Label><Input type="date" value={uploadData.valid_until} onChange={(e) => setUploadData({ ...uploadData, valid_until: e.target.value })} /></div>
              </div>
              <div><Label>Muistiinpanot</Label><Input value={uploadData.notes} onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Peruuta</Button>
                <Button type="submit" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "Ladataan..." : "Lataa"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader><DialogTitle>Esikatselu</DialogTitle></DialogHeader>
            {previewUrl && <iframe src={previewUrl} className="w-full h-full rounded-lg border" title="Preview" />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}