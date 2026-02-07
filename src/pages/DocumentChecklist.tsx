import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Building2,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isBefore, addDays, format } from "date-fns";
import { fi } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

interface DocumentType {
  id: string;
  name: string;
  is_required: boolean;
}

interface Company {
  id: string;
  name: string;
  business_id: string | null;
  contract_status: string | null;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type_id: string;
  valid_until: string | null;
  status: string;
}

interface CompanyDocumentStatus {
  company: Company;
  missingDocuments: DocumentType[];
  expiringDocuments: { document: DocumentType; validUntil: string }[];
  expiredDocuments: { document: DocumentType; validUntil: string }[];
  validDocuments: DocumentType[];
  overallStatus: "ok" | "warning" | "critical";
}

export default function DocumentChecklist() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-checklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, business_id, contract_status")
        .order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  // Fetch required document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ["required-document-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("id, name, is_required")
        .eq("is_required", true)
        .order("name");
      if (error) throw error;
      return data as DocumentType[];
    },
  });

  // Fetch all company documents
  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey: ["all-company-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("id, company_id, document_type_id, valid_until, status");
      if (error) throw error;
      return data as CompanyDocument[];
    },
  });

  // Calculate document status for each company
  const companyStatuses: CompanyDocumentStatus[] = companies.map((company) => {
    const companyDocs = allDocuments.filter((d) => d.company_id === company.id);
    const now = new Date();
    const warningDate = addDays(now, 30);

    const missingDocuments: DocumentType[] = [];
    const expiringDocuments: { document: DocumentType; validUntil: string }[] = [];
    const expiredDocuments: { document: DocumentType; validUntil: string }[] = [];
    const validDocuments: DocumentType[] = [];

    documentTypes.forEach((docType) => {
      const doc = companyDocs.find((d) => d.document_type_id === docType.id);

      if (!doc) {
        missingDocuments.push(docType);
      } else if (doc.status === "expired" || (doc.valid_until && isBefore(new Date(doc.valid_until), now))) {
        expiredDocuments.push({ document: docType, validUntil: doc.valid_until || "" });
      } else if (doc.valid_until && isBefore(new Date(doc.valid_until), warningDate)) {
        expiringDocuments.push({ document: docType, validUntil: doc.valid_until });
      } else {
        validDocuments.push(docType);
      }
    });

    const overallStatus: "ok" | "warning" | "critical" =
      missingDocuments.length > 0 || expiredDocuments.length > 0
        ? "critical"
        : expiringDocuments.length > 0
        ? "warning"
        : "ok";

    return {
      company,
      missingDocuments,
      expiringDocuments,
      expiredDocuments,
      validDocuments,
      overallStatus,
    };
  });

  // Filter companies
  const filteredStatuses = companyStatuses.filter((status) => {
    const matchesSearch =
      status.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      status.company.business_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "critical" && status.overallStatus === "critical") ||
      (statusFilter === "warning" && status.overallStatus === "warning") ||
      (statusFilter === "ok" && status.overallStatus === "ok");

    return matchesSearch && matchesStatus;
  });

  // Sort by status (critical first)
  const sortedStatuses = [...filteredStatuses].sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 };
    return order[a.overallStatus] - order[b.overallStatus];
  });

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedStatuses, { pageSize: 20 });

  // Stats
  const stats = {
    critical: companyStatuses.filter((s) => s.overallStatus === "critical").length,
    warning: companyStatuses.filter((s) => s.overallStatus === "warning").length,
    ok: companyStatuses.filter((s) => s.overallStatus === "ok").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dokumenttien tarkistuslista</h1>
          <p className="text-muted-foreground mt-1">
            Seuraa autoilijoiden pakollisten dokumenttien tilaa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "critical" ? "ring-2 ring-destructive" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "critical" ? "all" : "critical")}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Puuttuvia / vanhentuneita</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "warning" ? "ring-2 ring-status-maintenance" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "warning" ? "all" : "warning")}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-maintenance/10">
                  <Clock className="h-5 w-5 text-status-maintenance-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-status-maintenance-foreground">{stats.warning}</p>
                  <p className="text-sm text-muted-foreground">Vanhenee pian (30pv)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "ok" ? "ring-2 ring-status-active" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "ok" ? "all" : "ok")}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-active/10">
                  <CheckCircle2 className="h-5 w-5 text-status-active-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-status-active-foreground">{stats.ok}</p>
                  <p className="text-sm text-muted-foreground">Kunnossa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hae nimellä tai Y-tunnuksella..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kaikki tilat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki tilat</SelectItem>
              <SelectItem value="critical">Kriittinen</SelectItem>
              <SelectItem value="warning">Varoitus</SelectItem>
              <SelectItem value="ok">Kunnossa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Document checklist table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Autoilijat ja dokumentit ({sortedStatuses.length})
            </CardTitle>
            <CardDescription>
              Pakolliset dokumentit: {documentTypes.map((dt) => dt.name).join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ladataan...
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ei autoilijoita
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Autoilija</TableHead>
                      <TableHead>Y-tunnus</TableHead>
                      <TableHead>Tila</TableHead>
                      <TableHead>Puuttuvat</TableHead>
                      <TableHead>Vanhenee pian</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((status) => (
                      <TableRow
                        key={status.company.id}
                        className={
                          status.overallStatus === "critical"
                            ? "bg-destructive/5"
                            : status.overallStatus === "warning"
                            ? "bg-status-maintenance/5"
                            : ""
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {status.company.name}
                          </div>
                        </TableCell>
                        <TableCell>{status.company.business_id || "—"}</TableCell>
                        <TableCell>
                          {status.overallStatus === "critical" && (
                            <Badge className="bg-destructive text-destructive-foreground">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Kriittinen
                            </Badge>
                          )}
                          {status.overallStatus === "warning" && (
                            <Badge className="bg-status-maintenance text-status-maintenance-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              Varoitus
                            </Badge>
                          )}
                          {status.overallStatus === "ok" && (
                            <Badge className="bg-status-active text-status-active-foreground">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Kunnossa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {status.missingDocuments.length > 0 ||
                          status.expiredDocuments.length > 0 ? (
                            <div className="text-sm text-destructive">
                              {[
                                ...status.missingDocuments.map((d) => d.name),
                                ...status.expiredDocuments.map((d) => d.document.name),
                              ].join(", ")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {status.expiringDocuments.length > 0 ? (
                            <div className="text-sm text-status-maintenance-foreground">
                              {status.expiringDocuments.map((d) => (
                                <div key={d.document.id}>
                                  {d.document.name} ({format(new Date(d.validUntil), "d.M.yyyy", { locale: fi })})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/autoilijat/${status.company.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Avaa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
