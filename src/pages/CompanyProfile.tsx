import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  FileText,
  Upload,
  Download,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Car,
  User,
  Phone,
  Mail,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { fi } from "date-fns/locale";

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  validity_period_months: number | null;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  signed_at: string | null;
  signed_by: string | null;
  signature_method: string | null;
  notes: string | null;
  created_at: string;
  document_type?: DocumentType;
}

interface Company {
  id: string;
  name: string;
  business_id: string | null;
  address: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contract_status: string | null;
}

const statusColors: Record<string, string> = {
  active: "bg-status-active text-status-active-foreground",
  expired: "bg-status-removed text-status-removed-foreground",
  pending: "bg-status-maintenance text-status-maintenance-foreground",
  rejected: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "Voimassa",
  expired: "Vanhentunut",
  pending: "Odottaa",
  rejected: "Hylätty",
};

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_type_id: "",
    valid_from: "",
    valid_until: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });

  // Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .or("scope.is.null,scope.eq.company")
        .order("is_required", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as DocumentType[];
    },
  });

  // Fetch company documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["company-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select(`
          *,
          document_type:document_types(*)
        `)
        .eq("company_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CompanyDocument[];
    },
    enabled: !!id,
  });

  // Fetch company vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ["company-vehicles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, vehicle_number, registration_number, brand, model, status")
        .eq("company_id", id)
        .order("vehicle_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: typeof uploadData }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Kirjautuminen vaaditaan");

      // Upload file to storage
      const fileExt = data.file.name.split(".").pop();
      const filePath = `${id}/${Date.now()}_${data.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, data.file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from("company_documents")
        .insert({
          company_id: id,
          document_type_id: data.metadata.document_type_id,
          file_name: data.file.name,
          file_path: filePath,
          file_type: fileExt || "pdf",
          valid_from: data.metadata.valid_from || null,
          valid_until: data.metadata.valid_until || null,
          notes: data.metadata.notes || null,
          uploaded_by: user.user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents", id] });
      queryClient.invalidateQueries({ queryKey: ["document-status"] });
      toast.success("Dokumentti ladattu onnistuneesti");
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadData({
        document_type_id: "",
        valid_from: "",
        valid_until: "",
        notes: "",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Virhe ladattaessa dokumenttia");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: CompanyDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("company-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from("company_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents", id] });
      queryClient.invalidateQueries({ queryKey: ["document-status"] });
      toast.success("Dokumentti poistettu");
    },
    onError: () => {
      toast.error("Virhe poistettaessa dokumenttia");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Tiedosto on liian suuri (max 10MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadData.document_type_id) {
      toast.error("Valitse tiedosto ja dokumenttityyppi");
      return;
    }
    uploadMutation.mutate({ file: selectedFile, metadata: uploadData });
  };

  const handleDownload = async (doc: CompanyDocument) => {
    const { data, error } = await supabase.storage
      .from("company-documents")
      .download(doc.file_path);

    if (error) {
      toast.error("Virhe ladattaessa tiedostoa");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (doc: CompanyDocument) => {
    const { data, error } = await supabase.storage
      .from("company-documents")
      .createSignedUrl(doc.file_path, 3600);

    if (error) {
      toast.error("Virhe avattaessa tiedostoa");
      return;
    }

    setPreviewUrl(data.signedUrl);
    setIsPreviewOpen(true);
  };

  const getDocumentStatus = (doc: CompanyDocument) => {
    if (doc.status === "expired" || (doc.valid_until && isBefore(new Date(doc.valid_until), new Date()))) {
      return "expired";
    }
    if (doc.status === "pending") return "pending";
    if (doc.status === "rejected") return "rejected";
    
    // Check if expiring soon (within 30 days)
    if (doc.valid_until && isBefore(new Date(doc.valid_until), addDays(new Date(), 30))) {
      return "expiring";
    }
    return "active";
  };

  const getMissingDocuments = () => {
    const requiredTypes = documentTypes.filter((dt) => dt.is_required);
    return requiredTypes.filter((dt) => {
      const hasValidDoc = documents.some(
        (doc) =>
          doc.document_type_id === dt.id &&
          getDocumentStatus(doc) === "active"
      );
      return !hasValidDoc;
    });
  };

  const missingDocs = getMissingDocuments();

  if (companyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Ladataan...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-muted-foreground">Yritystä ei löytynyt</div>
          <Button onClick={() => navigate("/autoilijat")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Takaisin
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/autoilijat")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
              {company.business_id && (
                <p className="text-muted-foreground">Y-tunnus: {company.business_id}</p>
              )}
            </div>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Upload className="h-4 w-4" />
                Lataa dokumentti
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Lataa uusi dokumentti</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <Label>Dokumenttityyppi *</Label>
                  <Select
                    value={uploadData.document_type_id}
                    onValueChange={(value) =>
                      setUploadData({ ...uploadData, document_type_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Valitse tyyppi" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name} {dt.is_required && "*"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tiedosto (PDF, max 10MB) *</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFile.name}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Voimassa alkaen</Label>
                    <Input
                      type="date"
                      value={uploadData.valid_from}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, valid_from: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Voimassa saakka</Label>
                    <Input
                      type="date"
                      value={uploadData.valid_until}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, valid_until: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Muistiinpanot</Label>
                  <Input
                    value={uploadData.notes}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, notes: e.target.value })
                    }
                    placeholder="Lisätietoja..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                  >
                    Peruuta
                  </Button>
                  <Button type="submit" disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Ladataan..." : "Lataa"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Missing documents alert */}
        {missingDocs.length > 0 && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    Puuttuvat pakolliset dokumentit:
                  </p>
                  <ul className="mt-1 text-sm text-destructive/80">
                    {missingDocs.map((dt) => (
                      <li key={dt.id}>• {dt.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Tiedot</TabsTrigger>
            <TabsTrigger value="documents">
              Dokumentit ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="vehicles">
              Ajoneuvot ({vehicles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Yrityksen tiedot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Yhteyshenkilö</p>
                    <p className="font-medium">{company.contact_person || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Puhelin</p>
                    <p className="font-medium">{company.contact_phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sähköposti</p>
                    <p className="font-medium">{company.contact_email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Osoite</p>
                    <p className="font-medium">{company.address || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Dokumentit ja sopimukset
                </CardTitle>
                <CardDescription>
                  Kaikki yrityksen dokumentit ja niiden voimassaolo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ladataan...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ei dokumentteja
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tyyppi</TableHead>
                        <TableHead>Tiedosto</TableHead>
                        <TableHead>Voimassa</TableHead>
                        <TableHead>Tila</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const status = getDocumentStatus(doc);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              {doc.document_type?.name || "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {doc.file_name}
                            </TableCell>
                            <TableCell>
                              {doc.valid_until ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(doc.valid_until), "d.M.yyyy", {
                                    locale: fi,
                                  })}
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  status === "expiring"
                                    ? "bg-status-maintenance text-status-maintenance-foreground"
                                    : statusColors[status] || statusColors.active
                                }
                              >
                                {status === "expiring" ? (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Vanhenee pian
                                  </>
                                ) : status === "active" ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {statusLabels.active}
                                  </>
                                ) : status === "expired" ? (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {statusLabels.expired}
                                  </>
                                ) : (
                                  statusLabels[status]
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreview(doc)}
                                  title="Esikatsele"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(doc)}
                                  title="Lataa"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMutation.mutate(doc)}
                                  title="Poista"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Yrityksen ajoneuvot
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ei ajoneuvoja
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Autonumero</TableHead>
                        <TableHead>Rekisterinumero</TableHead>
                        <TableHead>Malli</TableHead>
                        <TableHead>Tila</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">
                            {vehicle.vehicle_number}
                          </TableCell>
                          <TableCell>{vehicle.registration_number}</TableCell>
                          <TableCell>
                            {vehicle.brand} {vehicle.model}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{vehicle.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* PDF Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Dokumentin esikatselu</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border"
                title="PDF Preview"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
