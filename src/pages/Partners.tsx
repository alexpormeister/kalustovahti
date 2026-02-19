import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Search, ExternalLink, Filter, ChevronsUpDown, Tag } from "lucide-react";
import { useCanEdit } from "@/components/auth/ProtectedPage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated';

interface Company {
  id: string;
  name: string;
  business_id: string | null;
  address: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contract_status: ContractStatus | null;
  created_at: string;
}

const contractStatusLabels: Record<ContractStatus, string> = {
  active: "Aktiivinen", expired: "Vanhentunut", pending: "Odottaa", terminated: "Päättynyt",
};

const contractStatusColors: Record<ContractStatus, string> = {
  active: "bg-status-active text-status-active-foreground",
  expired: "bg-status-removed text-status-removed-foreground",
  pending: "bg-status-maintenance text-status-maintenance-foreground",
  terminated: "bg-muted text-muted-foreground",
};

export default function Partners() {
  const navigate = useNavigate();
  const canEdit = useCanEdit("autoilijat");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [businessIdError, setBusinessIdError] = useState<string | null>(null);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "", business_id: "", address: "", contact_person: "",
    contact_email: "", contact_phone: "", contract_status: "active" as ContractStatus,
  });

  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: companyVehicles = [] } = useQuery({
    queryKey: ["company-vehicles-search"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("vehicle_number, registration_number, company_id").not("company_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Company attributes
  const { data: companyAttributes = [] } = useQuery({
    queryKey: ["company-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_attributes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: companyAttrLinks = [] } = useQuery({
    queryKey: ["company-attr-links", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase.from("company_attribute_links").select("attribute_id").eq("company_id", selectedCompany.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Sync selectedAttributeIds when editing a company
  useEffect(() => {
    if (selectedCompany && companyAttrLinks.length >= 0) {
      setSelectedAttributeIds(companyAttrLinks.map((l) => l.attribute_id));
    }
  }, [selectedCompany, companyAttrLinks]);

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase.from("audit_logs").select("*").eq("table_name", "companies").eq("record_id", selectedCompany.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("companies").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Autoilija lisätty onnistuneesti"); setIsAddDialogOpen(false); resetForm(); },
    onError: (error: any) => {
      if (error?.message?.includes("companies_name_unique")) { toast.error("Tämän niminen yritys on jo järjestelmässä"); setNameError("Yritys on jo järjestelmässä"); }
      else if (error?.message?.includes("companies_business_id_unique")) { toast.error("Tällä Y-tunnuksella on jo yritys järjestelmässä"); setBusinessIdError("Y-tunnus on jo käytössä"); }
      else toast.error("Virhe lisättäessä autoilijaa");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("companies").update(data).eq("id", id);
      if (error) throw error;
      // Update attribute links
      await supabase.from("company_attribute_links").delete().eq("company_id", id);
      if (selectedAttributeIds.length > 0) {
        const links = selectedAttributeIds.map((attribute_id) => ({ company_id: id, attribute_id }));
        const { error: linkError } = await supabase.from("company_attribute_links").insert(links);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); queryClient.invalidateQueries({ queryKey: ["company-attr-links"] }); toast.success("Autoilija päivitetty onnistuneesti"); setSelectedCompany(null); resetForm(); },
    onError: (error: any) => {
      if (error?.message?.includes("companies_name_unique")) { toast.error("Tämän niminen yritys on jo järjestelmässä"); setNameError("Yritys on jo järjestelmässä"); }
      else if (error?.message?.includes("companies_business_id_unique")) { toast.error("Tällä Y-tunnuksella on jo yritys järjestelmässä"); setBusinessIdError("Y-tunnus on jo käytössä"); }
      else toast.error("Virhe päivitettäessä autoilijaa");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", business_id: "", address: "", contact_person: "", contact_email: "", contact_phone: "", contract_status: "active" });
    setNameError(null); setBusinessIdError(null); setSelectedAttributeIds([]);
  };

  const checkDuplicateName = (name: string) => {
    const existing = companies.find(c => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== selectedCompany?.id);
    setNameError(existing ? "Tämän niminen yritys on jo järjestelmässä" : null);
  };

  const checkDuplicateBusinessId = (bid: string) => {
    if (!bid.trim()) { setBusinessIdError(null); return; }
    const existing = companies.find(c => c.business_id === bid.trim() && c.id !== selectedCompany?.id);
    setBusinessIdError(existing ? "Tällä Y-tunnuksella on jo yritys järjestelmässä" : null);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({ name: company.name, business_id: company.business_id || "", address: company.address || "", contact_person: company.contact_person || "", contact_email: company.contact_email || "", contact_phone: company.contact_phone || "", contract_status: company.contract_status || "active" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError || businessIdError) { toast.error("Korjaa lomakkeen virheet"); return; }
    if (selectedCompany) updateMutation.mutate({ id: selectedCompany.id, data: formData });
    else createMutation.mutate(formData);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || company.name.toLowerCase().includes(query) || company.business_id?.toLowerCase().includes(query) || company.contact_person?.toLowerCase().includes(query) || company.contact_email?.toLowerCase().includes(query) || company.contact_phone?.toLowerCase().includes(query) || company.address?.toLowerCase().includes(query) || companyVehicles.some(v => v.company_id === company.id && (v.vehicle_number.toLowerCase().includes(query) || v.registration_number.toLowerCase().includes(query)));
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(company.contract_status || "");
    return matchesSearch && matchesStatus;
  });

  const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedCompanies, startIndex, endIndex, totalItems } = usePagination(filteredCompanies);

  const companyFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Yrityksen nimi *</Label><Input value={formData.name} onChange={(e) => { setFormData({ ...formData, name: e.target.value }); checkDuplicateName(e.target.value); }} className={nameError ? "border-destructive" : ""} required />{nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}</div>
        <div><Label>Y-tunnus</Label><Input value={formData.business_id} onChange={(e) => { setFormData({ ...formData, business_id: e.target.value }); checkDuplicateBusinessId(e.target.value); }} className={businessIdError ? "border-destructive" : ""} placeholder="1234567-8" />{businessIdError && <p className="text-sm text-destructive mt-1">{businessIdError}</p>}</div>
      </div>
      <div><Label>Osoite</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Yhteyshenkilö</Label><Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} /></div>
        <div><Label>Puhelin</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Sähköposti</Label><Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} /></div>
        <div><Label>Sopimuksen tila</Label>
          <Select value={formData.contract_status} onValueChange={(v: ContractStatus) => setFormData({ ...formData, contract_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Aktiivinen</SelectItem><SelectItem value="pending">Odottaa</SelectItem><SelectItem value="expired">Vanhentunut</SelectItem><SelectItem value="terminated">Päättynyt</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {selectedCompany && companyAttributes.length > 0 && (
        <div>
          <Label className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4" />Attribuutit</Label>
          <div className="flex flex-wrap gap-3">
            {companyAttributes.map((attr) => (
              <div key={attr.id} className="flex items-center gap-2">
                <Checkbox
                  id={`edit-attr-${attr.id}`}
                  checked={selectedAttributeIds.includes(attr.id)}
                  onCheckedChange={(checked) => setSelectedAttributeIds(prev => checked ? [...prev, attr.id] : prev.filter(id => id !== attr.id))}
                />
                <label htmlFor={`edit-attr-${attr.id}`} className="text-sm cursor-pointer">{attr.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setSelectedCompany(null); resetForm(); }}>Peruuta</Button>
        <Button type="submit">Tallenna</Button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold text-foreground">Autoilijat</h1><p className="text-muted-foreground mt-1">Hallitse sopimusyrityksiä ja autoilijoita</p></div>
          {canEdit && <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />Lisää autoilija</Button></DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Lisää uusi autoilija</DialogTitle></DialogHeader>
              {companyFormJSX}
            </DialogContent>
          </Dialog>}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hae nimellä, Y-tunnuksella, autonumerolla..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />Suodattimet
            {statusFilters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{statusFilters.length}</Badge>}
          </Button>
        </div>

        {showFilters && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label>Tila</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48 justify-between">
                        {statusFilters.length > 0 ? `${statusFilters.length} valittu` : "Kaikki tilat"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      {(Object.entries(contractStatusLabels) as [ContractStatus, string][]).map(([status, label]) => (
                        <div key={status} className="flex items-center gap-2 py-1">
                          <Checkbox checked={statusFilters.includes(status)} onCheckedChange={() => toggleStatusFilter(status)} id={`filter-status-${status}`} />
                          <label htmlFor={`filter-status-${status}`} className="text-sm cursor-pointer">{label}</label>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>
                  {statusFilters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {statusFilters.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1 text-xs">
                          {contractStatusLabels[s as ContractStatus] || s}
                          <button onClick={() => toggleStatusFilter(s)} className="ml-1 hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!selectedCompany} onOpenChange={(open) => { if (!open) { setSelectedCompany(null); resetForm(); } }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Muokkaa autoilijaa</DialogTitle></DialogHeader>
            {companyFormJSX}
          </DialogContent>
        </Dialog>

        {/* Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Sopimusyritykset ({filteredCompanies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8 text-muted-foreground">Ladataan...</div> : paginatedCompanies.length === 0 ? <div className="text-center py-8 text-muted-foreground">Ei autoilijoita</div> : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Yritys</TableHead><TableHead>Y-tunnus</TableHead><TableHead>Yhteyshenkilö</TableHead><TableHead>Puhelin</TableHead><TableHead>Sopimus</TableHead><TableHead></TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCompanies.map(company => (
                      <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/autoilijat/${company.id}`)}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.business_id || "—"}</TableCell>
                        <TableCell>{company.contact_person || "—"}</TableCell>
                        <TableCell>{company.contact_phone || "—"}</TableCell>
                        <TableCell>{company.contract_status && <Badge className={contractStatusColors[company.contract_status]}>{contractStatusLabels[company.contract_status]}</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(company)}><ExternalLink className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                </Table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
