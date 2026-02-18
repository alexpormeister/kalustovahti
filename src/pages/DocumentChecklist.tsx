import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertTriangle, CheckCircle2, Clock, FileText, Building2, ExternalLink, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isBefore, addDays, format } from "date-fns";
import { fi } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

interface DocumentType {
  id: string;
  name: string;
  is_required: boolean;
  scope: string | null;
}

interface Company {
  id: string;
  name: string;
  business_id: string | null;
  contract_status: string | null;
}

interface Driver {
  id: string;
  full_name: string;
  driver_number: string;
  company_id: string | null;
  status: string;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type_id: string;
  valid_until: string | null;
  status: string;
}

interface DriverDocument {
  id: string;
  driver_id: string;
  document_type_id: string;
  valid_until: string | null;
  status: string | null;
}

interface DocStatus {
  entity: { id: string; name: string; subtitle?: string };
  missingDocuments: DocumentType[];
  expiringDocuments: { document: DocumentType; validUntil: string }[];
  expiredDocuments: { document: DocumentType; validUntil: string }[];
  validDocuments: DocumentType[];
  overallStatus: "ok" | "warning" | "critical";
}

function calculateDocStatus(
  entityId: string,
  entityName: string,
  entitySubtitle: string | undefined,
  docs: { document_type_id: string; valid_until: string | null; status: string | null }[],
  requiredTypes: DocumentType[]
): DocStatus {
  const now = new Date();
  const warningDate = addDays(now, 30);
  const missingDocuments: DocumentType[] = [];
  const expiringDocuments: { document: DocumentType; validUntil: string }[] = [];
  const expiredDocuments: { document: DocumentType; validUntil: string }[] = [];
  const validDocuments: DocumentType[] = [];

  requiredTypes.forEach((docType) => {
    const doc = docs.find((d) => d.document_type_id === docType.id);
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

  return { entity: { id: entityId, name: entityName, subtitle: entitySubtitle }, missingDocuments, expiringDocuments, expiredDocuments, validDocuments, overallStatus };
}

function StatusBadgeDoc({ status }: { status: "ok" | "warning" | "critical" }) {
  if (status === "critical") return <Badge className="bg-destructive text-destructive-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Kriittinen</Badge>;
  if (status === "warning") return <Badge className="bg-status-maintenance text-status-maintenance-foreground"><Clock className="h-3 w-3 mr-1" />Varoitus</Badge>;
  return <Badge className="bg-status-active text-status-active-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Kunnossa</Badge>;
}

function DocTable({ data, navigatePrefix, icon: Icon }: { data: DocStatus[]; navigatePrefix: string; icon: any }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = data.filter((s) => {
    const matchesSearch = s.entity.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.entity.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 };
    return order[a.overallStatus] - order[b.overallStatus];
  });

  const { currentPage, setCurrentPage, totalPages, paginatedData, startIndex, endIndex, totalItems } = usePagination(sorted, { pageSize: 20 });

  const stats = { critical: data.filter(s => s.overallStatus === "critical").length, warning: data.filter(s => s.overallStatus === "warning").length, ok: data.filter(s => s.overallStatus === "ok").length };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card border-destructive/20"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{stats.critical}</p><p className="text-xs text-muted-foreground">Kriittinen</p></CardContent></Card>
        <Card className="glass-card border-status-maintenance/20"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-status-maintenance-foreground">{stats.warning}</p><p className="text-xs text-muted-foreground">Varoitus</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-status-active">{stats.ok}</p><p className="text-xs text-muted-foreground">Kunnossa</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Hae nimellä..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kaikki tilat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki tilat</SelectItem>
            <SelectItem value="critical">Kriittinen</SelectItem>
            <SelectItem value="warning">Varoitus</SelectItem>
            <SelectItem value="ok">Kunnossa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paginatedData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Ei tuloksia</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead>Tila</TableHead>
                <TableHead>Puuttuvat / Vanhentuneet</TableHead>
                <TableHead>Vanhenee pian</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((status) => (
                <TableRow key={status.entity.id} className={status.overallStatus === "critical" ? "bg-destructive/5" : status.overallStatus === "warning" ? "bg-status-maintenance/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p>{status.entity.name}</p>
                        {status.entity.subtitle && <p className="text-xs text-muted-foreground">{status.entity.subtitle}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadgeDoc status={status.overallStatus} /></TableCell>
                  <TableCell>
                    {status.missingDocuments.length > 0 || status.expiredDocuments.length > 0 ? (
                      <div className="text-sm text-destructive">
                        {[...status.missingDocuments.map(d => d.name), ...status.expiredDocuments.map(d => d.document.name)].join(", ")}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {status.expiringDocuments.length > 0 ? (
                      <div className="text-sm text-status-maintenance-foreground">
                        {status.expiringDocuments.map(d => <div key={d.document.id}>{d.document.name} ({format(new Date(d.validUntil), "d.M.yyyy", { locale: fi })})</div>)}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`${navigatePrefix}/${status.entity.id}?tab=documents`)}>
                      <ExternalLink className="h-4 w-4 mr-1" />Avaa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
        </>
      )}
    </div>
  );
}

export default function DocumentChecklist() {
  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-checklist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, business_id, contract_status").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  // Fetch drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-for-checklist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("id, full_name, driver_number, company_id, status").eq("status", "active").order("full_name");
      if (error) throw error;
      return data as Driver[];
    },
  });

  // Fetch required company document types
  const { data: companyDocTypes = [] } = useQuery({
    queryKey: ["required-company-doc-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("id, name, is_required, scope").eq("is_required", true).or("scope.is.null,scope.eq.company").order("name");
      if (error) throw error;
      return data as DocumentType[];
    },
  });

  // Fetch required driver document types
  const { data: driverDocTypes = [] } = useQuery({
    queryKey: ["required-driver-doc-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("id, name, is_required, scope").eq("is_required", true).eq("scope", "driver").order("name");
      if (error) throw error;
      return data as DocumentType[];
    },
  });

  // Fetch all company documents
  const { data: companyDocs = [] } = useQuery({
    queryKey: ["all-company-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_documents").select("id, company_id, document_type_id, valid_until, status");
      if (error) throw error;
      return data as CompanyDocument[];
    },
  });

  // Fetch all driver documents
  const { data: driverDocs = [] } = useQuery({
    queryKey: ["all-driver-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("driver_documents").select("id, driver_id, document_type_id, valid_until, status");
      if (error) throw error;
      return data as DriverDocument[];
    },
  });

  // Calculate company statuses
  const companyStatuses: DocStatus[] = companies.map((company) => {
    const docs = companyDocs.filter(d => d.company_id === company.id);
    return calculateDocStatus(company.id, company.name, company.business_id || undefined, docs, companyDocTypes);
  });

  // Calculate driver statuses
  const driverStatuses: DocStatus[] = drivers.map((driver) => {
    const docs = driverDocs.filter(d => d.driver_id === driver.id);
    return calculateDocStatus(driver.id, driver.full_name, `#${driver.driver_number}`, docs, driverDocTypes);
  });

  const companyAlerts = companyStatuses.filter(s => s.overallStatus !== "ok").length;
  const driverAlerts = driverStatuses.filter(s => s.overallStatus !== "ok").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dokumenttien tarkistuslista</h1>
          <p className="text-muted-foreground mt-1">Seuraa autoilijoiden ja kuljettajien pakollisten dokumenttien tilaa</p>
        </div>

        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Autoilijat
              {companyAlerts > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{companyAlerts}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              <User className="h-4 w-4" />
              Kuljettajat
              {driverAlerts > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{driverAlerts}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Autoilijat ja dokumentit</CardTitle>
                <CardDescription>Pakolliset dokumentit: {companyDocTypes.map(dt => dt.name).join(", ") || "Ei pakollisia"}</CardDescription>
              </CardHeader>
              <CardContent>
                <DocTable data={companyStatuses} navigatePrefix="/autoilijat" icon={Building2} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Kuljettajat ja dokumentit</CardTitle>
                <CardDescription>Pakolliset dokumentit: {driverDocTypes.map(dt => dt.name).join(", ") || "Ei pakollisia"}</CardDescription>
              </CardHeader>
              <CardContent>
                <DocTable data={driverStatuses} navigatePrefix="/kuljettajat" icon={User} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
