import { useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Building2, FileText, Upload, Download, Eye, Calendar,
  AlertTriangle, CheckCircle2, Clock, XCircle, Car, User, Phone, Mail, MapPin, Trash2, Pencil, Save, X, Tag, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, addDays } from "date-fns";
import { fi } from "date-fns/locale";

const statusColors: Record<string, string> = {
  active: "bg-status-active text-status-active-foreground",
  expired: "bg-status-removed text-status-removed-foreground",
  pending: "bg-status-maintenance text-status-maintenance-foreground",
  rejected: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = { active: "Voimassa", expired: "Vanhentunut", pending: "Odottaa", rejected: "Hylätty" };

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "info";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ document_type_id: "", valid_from: "", valid_until: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("*").or("scope.is.null,scope.eq.company").order("is_required", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["company-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_documents").select("*, document_type:document_types(*)").eq("company_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["company-vehicles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, vehicle_number, registration_number, brand, model, status").eq("company_id", id).order("vehicle_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: companyAttributes = [] } = useQuery({
    queryKey: ["company-profile-attributes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_attribute_links").select("id, attribute:company_attributes(id, name)").eq("company_id", id);
      if (error) throw error;
      return data.map((l: any) => ({ linkId: l.id, ...l.attribute }));
    },
    enabled: !!id,
  });

  const { data: allCompanyAttributes = [] } = useQuery({
    queryKey: ["all-company-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sharedAttachments = [] } = useQuery({
    queryKey: ["shared-attachments-company"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_attachments").select("*").or("scope.eq.all,scope.eq.company").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addCompanyAttrMutation = useMutation({
    mutationFn: async (attributeId: string) => {
      const { error } = await supabase.from("company_attribute_links").insert({ company_id: id, attribute_id: attributeId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-profile-attributes", id] }); toast.success("Attribuutti lisätty"); },
    onError: () => toast.error("Virhe lisättäessä attribuuttia"),
  });

  const removeCompanyAttrMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("company_attribute_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-profile-attributes", id] }); toast.success("Attribuutti poistettu"); },
    onError: () => toast.error("Virhe poistettaessa attribuuttia"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("companies").update({
        name: data.name, business_id: data.business_id || null,
        contact_person: data.contact_person || null, contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null, address: data.address || null,
        contract_status: data.contract_status || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      toast.success("Yritys päivitetty");
      setIsEditing(false);
    },
    onError: () => toast.error("Virhe päivitettäessä"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: typeof uploadData }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Kirjautuminen vaaditaan");
      const filePath = `${id}/${Date.now()}_${data.file.name}`;
      const { error: uploadError } = await supabase.storage.from("company-documents").upload(filePath, data.file);
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("company_documents").insert({
        company_id: id, document_type_id: data.metadata.document_type_id,
        file_name: data.file.name, file_path: filePath,
        file_type: data.file.name.split(".").pop() || "pdf",
        valid_from: data.metadata.valid_from || null, valid_until: data.metadata.valid_until || null,
        notes: data.metadata.notes || null, uploaded_by: user.user.id,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents", id] });
      toast.success("Dokumentti ladattu"); setIsUploadOpen(false); setSelectedFile(null);
      setUploadData({ document_type_id: "", valid_from: "", valid_until: "", notes: "" });
    },
    onError: () => toast.error("Virhe ladattaessa"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("company-documents").remove([doc.file_path]);
      const { error } = await supabase.from("company_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-documents", id] }); toast.success("Dokumentti poistettu"); },
    onError: () => toast.error("Virhe poistettaessa"),
  });

  const startEditing = () => {
    if (!company) return;
    setEditForm({
      name: company.name, business_id: company.business_id || "",
      contact_person: company.contact_person || "", contact_phone: company.contact_phone || "",
      contact_email: company.contact_email || "", address: company.address || "",
      contract_status: company.contract_status || "active",
    });
    setIsEditing(true);
  };

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from("company-documents").download(doc.file_path);
    if (error) { toast.error("Virhe"); return; }
    const url = URL.createObjectURL(data); const a = document.createElement("a"); a.href = url; a.download = doc.file_name; a.click(); URL.revokeObjectURL(url);
  };

  const handlePreview = async (doc: any) => {
    const { data, error } = await supabase.storage.from("company-documents").createSignedUrl(doc.file_path, 3600);
    if (error) { toast.error("Virhe"); return; }
    setPreviewUrl(data.signedUrl); setIsPreviewOpen(true);
  };

  const getDocumentStatus = (doc: any) => {
    if (doc.status === "expired" || (doc.valid_until && isBefore(new Date(doc.valid_until), new Date()))) return "expired";
    if (doc.status === "pending") return "pending";
    if (doc.status === "rejected") return "rejected";
    if (doc.valid_until && isBefore(new Date(doc.valid_until), addDays(new Date(), 30))) return "expiring";
    return "active";
  };

  const getMissingDocuments = () => {
    const required = documentTypes.filter((dt: any) => dt.is_required);
    return required.filter((dt: any) => !documents.some((doc: any) => doc.document_type_id === dt.id && getDocumentStatus(doc) === "active"));
  };

  const missingDocs = getMissingDocuments();

  if (companyLoading) return <DashboardLayout><div className="flex items-center justify-center h-96 text-muted-foreground">Ladataan...</div></DashboardLayout>;
  if (!company) return <DashboardLayout><div className="flex flex-col items-center justify-center h-96 gap-4"><p className="text-muted-foreground">Yritystä ei löytynyt</p><Button onClick={() => navigate("/autoilijat")}><ArrowLeft className="h-4 w-4 mr-2" />Takaisin</Button></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/autoilijat")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
              {company.business_id && <p className="text-muted-foreground">Y-tunnus: {company.business_id}</p>}
            </div>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4" />Lataa dokumentti
          </Button>
        </div>

        {missingDocs.length > 0 && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div><p className="font-medium text-destructive">Puuttuvat pakolliset dokumentit:</p>
                  <ul className="mt-1 text-sm text-destructive/80">{missingDocs.map((dt: any) => <li key={dt.id}>• {dt.name}</li>)}</ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="documents">Dokumentit ({documents.length})</TabsTrigger>
            <TabsTrigger value="vehicles">Ajoneuvot ({vehicles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Yrityksen tiedot</CardTitle>
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
                    <div><Label>Nimi</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                    <div><Label>Y-tunnus</Label><Input value={editForm.business_id} onChange={(e) => setEditForm({ ...editForm, business_id: e.target.value })} /></div>
                    <div><Label>Yhteyshenkilö</Label><Input value={editForm.contact_person} onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} /></div>
                    <div><Label>Puhelin</Label><Input value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} /></div>
                    <div><Label>Sähköposti</Label><Input value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} /></div>
                    <div><Label>Osoite</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                    <div><Label>Sopimustila</Label>
                      <Select value={editForm.contract_status} onValueChange={(v) => setEditForm({ ...editForm, contract_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktiivinen</SelectItem>
                          <SelectItem value="inactive">Ei-aktiivinen</SelectItem>
                          <SelectItem value="terminated">Päättynyt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Yhteyshenkilö</p><p className="font-medium">{company.contact_person || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Puhelin</p><p className="font-medium">{company.contact_phone || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Sähköposti</p><p className="font-medium">{company.contact_email || "—"}</p></div></div>
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Osoite</p><p className="font-medium">{company.address || "—"}</p></div></div>
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
                  {companyAttributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ei attribuutteja</p>
                  ) : (
                    companyAttributes.map((attr: any) => (
                      <Badge key={attr.id} variant="secondary" className="gap-1">
                        {attr.name}
                        <button className="ml-1 hover:text-destructive" onClick={() => removeCompanyAttrMutation.mutate(attr.linkId)}>×</button>
                      </Badge>
                    ))
                  )}
                </div>
                {allCompanyAttributes.filter((a: any) => !companyAttributes.some((ca: any) => ca.id === a.id)).length > 0 && (
                  <Select value="none" onValueChange={(v) => { if (v !== "none") addCompanyAttrMutation.mutate(v); }}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Lisää attribuutti" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Valitse attribuutti</SelectItem>
                      {allCompanyAttributes.filter((a: any) => !companyAttributes.some((ca: any) => ca.id === a.id)).map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">

            {/* Shared attachments */}
            {sharedAttachments.length > 0 && (
              <Card className="glass-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary" />Jaetut liitteet</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Nimi</TableHead><TableHead>Tiedosto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {sharedAttachments.map((att: any) => (
                        <TableRow key={att.id}>
                          <TableCell className="font-medium">{att.name}</TableCell>
                          <TableCell className="text-muted-foreground">{att.file_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={async () => {
                                const { data, error } = await supabase.storage.from("shared-attachments").createSignedUrl(att.file_path, 3600);
                                if (error) { toast.error("Virhe"); return; }
                                setPreviewUrl(data.signedUrl); setIsPreviewOpen(true);
                              }}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={async () => {
                                const { data, error } = await supabase.storage.from("shared-attachments").download(att.file_path);
                                if (error) { toast.error("Virhe"); return; }
                                const url = URL.createObjectURL(data); const a = document.createElement("a"); a.href = url; a.download = att.file_name; a.click(); URL.revokeObjectURL(url);
                              }}><Download className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Dokumentit ja sopimukset</CardTitle></CardHeader>
              <CardContent>
                {documentsLoading ? <div className="text-center py-8 text-muted-foreground">Ladataan...</div> : documents.length === 0 ? <div className="text-center py-8 text-muted-foreground">Ei dokumentteja</div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Tyyppi</TableHead><TableHead>Tiedosto</TableHead><TableHead>Voimassa</TableHead><TableHead>Tila</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => {
                        const status = getDocumentStatus(doc);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.document_type?.name || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.file_name}</TableCell>
                            <TableCell>{doc.valid_until ? <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(doc.valid_until), "d.M.yyyy", { locale: fi })}</div> : "—"}</TableCell>
                            <TableCell>
                              <Badge className={status === "expiring" ? "bg-status-maintenance text-status-maintenance-foreground" : statusColors[status] || statusColors.active}>
                                {status === "expiring" ? <><Clock className="h-3 w-3 mr-1" />Vanhenee pian</> : status === "active" ? <><CheckCircle2 className="h-3 w-3 mr-1" />{statusLabels.active}</> : status === "expired" ? <><XCircle className="h-3 w-3 mr-1" />{statusLabels.expired}</> : statusLabels[status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}><Download className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

          <TabsContent value="vehicles" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" />Yrityksen ajoneuvot</CardTitle></CardHeader>
              <CardContent>
                {vehicles.length === 0 ? <div className="text-center py-8 text-muted-foreground">Ei ajoneuvoja</div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Autonumero</TableHead><TableHead>Rekisterinumero</TableHead><TableHead>Malli</TableHead><TableHead>Tila</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {vehicles.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.vehicle_number}</TableCell>
                          <TableCell>{v.registration_number}</TableCell>
                          <TableCell>{v.brand} {v.model}</TableCell>
                          <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader><DialogTitle>Lataa uusi dokumentti</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (!selectedFile || !uploadData.document_type_id) { toast.error("Valitse tiedosto ja dokumenttityyppi"); return; } uploadMutation.mutate({ file: selectedFile, metadata: uploadData }); }} className="space-y-4">
              <div><Label>Dokumenttityyppi *</Label>
                <Select value={uploadData.document_type_id} onValueChange={(v) => setUploadData({ ...uploadData, document_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger>
                  <SelectContent>{documentTypes.map((dt: any) => <SelectItem key={dt.id} value={dt.id}>{dt.name} {dt.is_required && "*"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tiedosto (PDF, max 10MB) *</Label><Input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 10 * 1024 * 1024) { toast.error("Liian suuri (max 10MB)"); return; } setSelectedFile(f || null); }} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Voimassa alkaen</Label><Input type="date" value={uploadData.valid_from} onChange={(e) => setUploadData({ ...uploadData, valid_from: e.target.value })} /></div>
                <div><Label>Voimassa saakka</Label><Input type="date" value={uploadData.valid_until} onChange={(e) => setUploadData({ ...uploadData, valid_until: e.target.value })} /></div>
              </div>
              <div><Label>Muistiinpanot</Label><Input value={uploadData.notes} onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })} placeholder="Lisätietoja..." /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Peruuta</Button>
                <Button type="submit" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "Ladataan..." : "Lataa"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader className="flex-shrink-0"><DialogTitle>Dokumentin esikatselu</DialogTitle></DialogHeader>
            {previewUrl && <iframe src={previewUrl} className="w-full flex-1 min-h-0 rounded-lg border" title="PDF Preview" />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}