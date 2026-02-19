import { useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Phone, Mail, MapPin, Trash2, Shield, EyeOff, Pencil, Save, X, Tag,
  AlertTriangle, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, addDays } from "date-fns";
import { useCanEdit } from "@/components/auth/ProtectedPage";
import { fi } from "date-fns/locale";

export default function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEdit = useCanEdit("kuljettajat");
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "info";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ document_type_id: "", valid_from: "", valid_until: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSSN, setShowSSN] = useState(false);
  const [decryptedSSN, setDecryptedSSN] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: driver, isLoading } = useQuery({
    queryKey: ["driver", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
      const { data, error } = await supabase.from("driver_attribute_links").select("id, attribute:driver_attributes(id, name)").eq("driver_id", id);
      if (error) throw error;
      return data.map((l: any) => ({ linkId: l.id, ...l.attribute }));
    },
    enabled: !!id,
  });

  const { data: allDriverAttributes = [] } = useQuery({
    queryKey: ["all-driver-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allSharedAttachments = [] } = useQuery({
    queryKey: ["shared-attachments-driver"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_attachments").select("*").or("scope.eq.all,scope.eq.driver").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedAttachmentIds = [] } = useQuery({
    queryKey: ["driver-shared-attachment-links", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_shared_attachment_links").select("shared_attachment_id").eq("driver_id", id);
      if (error) throw error;
      return data.map((l: any) => l.shared_attachment_id);
    },
    enabled: !!id,
  });

  const linkedAttachments = allSharedAttachments.filter((a: any) => linkedAttachmentIds.includes(a.id));
  const unlinkedAttachments = allSharedAttachments.filter((a: any) => !linkedAttachmentIds.includes(a.id));

  const addSharedAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase.from("driver_shared_attachment_links").insert({ driver_id: id, shared_attachment_id: attachmentId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-shared-attachment-links", id] }); toast.success("Liite lisätty"); },
    onError: () => toast.error("Virhe lisättäessä liitettä"),
  });

  const removeSharedAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase.from("driver_shared_attachment_links").delete().eq("driver_id", id).eq("shared_attachment_id", attachmentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-shared-attachment-links", id] }); toast.success("Liite poistettu"); },
    onError: () => toast.error("Virhe poistettaessa liitettä"),
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
        full_name: data.full_name, driver_number: data.driver_number,
        phone: data.phone || null, email: data.email || null,
        city: data.municipalities ? data.municipalities.join(", ") : null,
        province: null, status: data.status, notes: data.notes || null,
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

  const addAttributeMutation = useMutation({
    mutationFn: async (attributeId: string) => {
      const { error } = await supabase.from("driver_attribute_links").insert({ driver_id: id, attribute_id: attributeId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-profile-attributes", id] }); toast.success("Attribuutti lisätty"); },
    onError: () => toast.error("Virhe lisättäessä attribuuttia"),
  });

  const removeAttributeMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("driver_attribute_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-profile-attributes", id] }); toast.success("Attribuutti poistettu"); },
    onError: () => toast.error("Virhe poistettaessa attribuuttia"),
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
      status: driver.status, notes: driver.notes || "",
      ssn_encrypted: "", // Don't pre-fill encrypted value
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

  // Use RPC to decrypt SSN - logs automatically to ssn_view_logs AND audit_logs
  const handleRevealSSN = async () => {
    if (showSSN) { setShowSSN(false); setDecryptedSSN(null); return; }
    try {
      const { data, error } = await supabase.rpc('get_driver_ssn', { p_driver_id: id } as any);
      if (error) throw error;
      setDecryptedSSN(data as string);
      setShowSSN(true);
      queryClient.invalidateQueries({ queryKey: ["driver-audit-logs", id] });
      toast.info("HETU-tiedon katselu kirjattu lokiin");
    } catch (err: any) {
      toast.error("Virhe HETU:n purkamisessa: " + err.message);
    }
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

  const maskSSN = (hasSSN: boolean) => {
    if (!hasSSN) return "—";
    if (showSSN && decryptedSSN) return decryptedSSN;
    return "••••••-••••";
  };

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    Object.keys({ ...oldData, ...newData }).forEach((key) => {
      if (key === "updated_at" || key === "created_at" || key === "ssn_encrypted") return;
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

  const availableAttributes = allDriverAttributes.filter(
    (a: any) => !driverAttributes.some((da: any) => da.id === a.id)
  );

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-96 text-muted-foreground">Ladataan...</div></DashboardLayout>;
  if (!driver) return <DashboardLayout><div className="flex flex-col items-center justify-center h-96 gap-4"><p className="text-muted-foreground">Kuljettajaa ei löytynyt</p><Button onClick={() => navigate("/kuljettajat")}><ArrowLeft className="h-4 w-4 mr-2" />Takaisin</Button></div></DashboardLayout>;

  const hasSSN = !!driver.ssn_encrypted && driver.ssn_encrypted.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kuljettajat")}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-3xl font-bold text-foreground">{driver.full_name}</h1><p className="text-muted-foreground">Kuljettaja #{driver.driver_number}</p></div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="documents">Dokumentit ({documents.length})</TabsTrigger>
            <TabsTrigger value="logs">Loki</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Kuljettajan tiedot</CardTitle>
                  {canEdit && (!isEditing ? (
                    <Button variant="outline" size="sm" onClick={startEditing}><Pencil className="h-4 w-4 mr-1" />Muokkaa</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-1" />Peruuta</Button>
                      <Button size="sm" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />Tallenna</Button>
                    </div>
                  ))}
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
                          <Badge key={m} variant="secondary" className="gap-1">{m}<button type="button" className="ml-1 hover:text-destructive" onClick={() => handleRemoveMunicipality(m)}>×</button></Badge>
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
                    <div className="sm:col-span-2"><Label>Henkilötunnus (HETU) — syötä uusi arvo päivittääksesi</Label><Input value={editForm.ssn_encrypted || ""} onChange={(e) => setEditForm({ ...editForm, ssn_encrypted: e.target.value })} placeholder="120190-123A" /></div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Kuljettajanumero</p><p className="font-medium">{driver.driver_number || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Puhelin</p><p className="font-medium">{driver.phone || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Sähköposti</p><p className="font-medium">{driver.email || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Kunnat</p><p className="font-medium">{driver.city || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Ammattiajon voimassaolo</p><p className="font-medium">{driver.driver_license_valid_until ? format(new Date(driver.driver_license_valid_until), "d.M.yyyy", { locale: fi }) : "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Henkilötunnus (HETU)</p><div className="flex items-center gap-2"><p className="font-medium font-mono">{maskSSN(hasSSN)}</p>{hasSSN && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRevealSSN}>{showSSN ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>}</div></div></div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Attributes section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Attribuutit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {driverAttributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ei attribuutteja</p>
                  ) : (
                    driverAttributes.map((attr: any) => (
                      <Badge key={attr.id} variant="secondary" className="gap-1">
                        {attr.name}
                        <button className="ml-1 hover:text-destructive" onClick={() => removeAttributeMutation.mutate(attr.linkId)}>×</button>
                      </Badge>
                    ))
                  )}
                </div>
                {availableAttributes.length > 0 && (
                  <Select value="none" onValueChange={(v) => { if (v !== "none") addAttributeMutation.mutate(v); }}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Lisää attribuutti" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Valitse attribuutti</SelectItem>
                      {availableAttributes.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {/* Missing required documents warning */}
            {(() => {
              const requiredTypes = documentTypes.filter((dt: any) => dt.is_required);
              const missingDocs = requiredTypes.filter((dt: any) => !documents.some((doc: any) => doc.document_type_id === dt.id && getDocumentStatus(doc) !== "expired"));
              return missingDocs.length > 0 ? (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Puuttuvat pakolliset dokumentit:</p>
                        <ul className="mt-1 text-sm text-destructive/80">{missingDocs.map((dt: any) => <li key={dt.id}>• {dt.name}</li>)}</ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Shared attachments - only linked ones + dropdown to add */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary" />Jaetut liitteet</CardTitle>
                  {canEdit && unlinkedAttachments.length > 0 && (
                    <Select value="none" onValueChange={(v) => { if (v !== "none") addSharedAttachmentMutation.mutate(v); }}>
                      <SelectTrigger className="w-[220px]"><SelectValue placeholder="Lisää liite..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Valitse liite</SelectItem>
                        {unlinkedAttachments.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {linkedAttachments.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Ei liitettyjä liitteitä</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Nimi</TableHead><TableHead>Tiedosto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {linkedAttachments.map((att: any) => (
                        <TableRow key={att.id}>
                          <TableCell className="font-medium">{att.name}</TableCell>
                          <TableCell className="text-muted-foreground">{att.file_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                                const { data, error } = await supabase.storage.from("shared-attachments").createSignedUrl(att.file_path, 3600);
                                if (error) { toast.error("Virhe"); return; }
                                setPreviewUrl(data.signedUrl); setIsPreviewOpen(true);
                              }}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                                const { data, error } = await supabase.storage.from("shared-attachments").download(att.file_path);
                                if (error) { toast.error("Virhe"); return; }
                                const url = URL.createObjectURL(data); const a = document.createElement("a"); a.href = url; a.download = att.file_name; a.click(); URL.revokeObjectURL(url);
                              }}><Download className="h-4 w-4" /></Button>
                              {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSharedAttachmentMutation.mutate(att.id)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Dokumentit</CardTitle>
                  {canEdit && <Button size="sm" className="gap-2" onClick={() => setIsUploadOpen(true)}><Upload className="h-4 w-4" />Lataa dokumentti</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Ei dokumentteja</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tyyppi</TableHead><TableHead>Tiedosto</TableHead><TableHead>Tila</TableHead><TableHead>Voimassa</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => {
                        const docStatus = getDocumentStatus(doc);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell>{doc.document_type?.name || "—"}</TableCell>
                            <TableCell>{doc.file_name}</TableCell>
                            <TableCell><Badge className={statusColors[docStatus]}>{docStatus === "active" ? "Voimassa" : docStatus === "expiring" ? "Vanhenee pian" : "Vanhentunut"}</Badge></TableCell>
                            <TableCell>{doc.valid_until ? format(new Date(doc.valid_until), "d.M.yyyy", { locale: fi }) : "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}><Download className="h-4 w-4" /></Button>
                                {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(doc)}><Trash2 className="h-4 w-4" /></Button>}
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

            {/* Upload dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Lataa dokumentti</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Dokumenttityyppi *</Label>
                    <Select value={uploadData.document_type_id} onValueChange={(v) => setUploadData({ ...uploadData, document_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
                      <SelectContent>{documentTypes.map((dt: any) => (<SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Voimassa alkaen</Label><Input type="date" value={uploadData.valid_from} onChange={(e) => setUploadData({ ...uploadData, valid_from: e.target.value })} /></div>
                    <div><Label>Voimassa saakka</Label><Input type="date" value={uploadData.valid_until} onChange={(e) => setUploadData({ ...uploadData, valid_until: e.target.value })} /></div>
                  </div>
                  <div><Label>Tiedosto *</Label><Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} ref={fileInputRef} /></div>
                  <div><Label>Muistiinpanot</Label><Input value={uploadData.notes} onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Peruuta</Button>
                    <Button onClick={() => { if (selectedFile && uploadData.document_type_id) uploadMutation.mutate({ file: selectedFile, metadata: uploadData }); else toast.error("Valitse tyyppi ja tiedosto"); }} disabled={uploadMutation.isPending}>
                      {uploadMutation.isPending ? "Ladataan..." : "Lataa"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Preview dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader><DialogTitle>Esikatselu</DialogTitle></DialogHeader>
                {previewUrl && <iframe src={previewUrl} className="w-full h-[70vh] rounded-md border" />}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Muutoshistoria</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Ei lokimerkintöjä</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log: any) => {
                      const changes = getChangedFields(log.old_data, log.new_data);
                      return (
                        <div key={log.id} className="border-b border-border pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant={log.action === "view_ssn" ? "outline" : log.action === "delete" ? "destructive" : "default"}>
                              {log.action === "view_ssn" ? "HETU katselu" : log.action === "create" ? "Luonti" : log.action === "update" ? "Muokkaus" : log.action === "delete" ? "Poisto" : log.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "d.M.yyyy HH:mm", { locale: fi })}</span>
                          </div>
                          {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
                          {changes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {changes.map((c, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-medium">{c.field}:</span>{" "}
                                  <span className="text-destructive line-through">{String(c.oldValue ?? "—")}</span>{" → "}
                                  <span className="text-status-active-foreground">{String(c.newValue ?? "—")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
