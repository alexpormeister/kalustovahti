import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Building2, Plus, Search, FileText, History, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";

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
  active: "Aktiivinen",
  expired: "Vanhentunut",
  pending: "Odottaa",
  terminated: "Päättynyt",
};

const contractStatusColors: Record<ContractStatus, string> = {
  active: "bg-status-active text-status-active-foreground",
  expired: "bg-status-removed text-status-removed-foreground",
  pending: "bg-status-maintenance text-status-maintenance-foreground",
  terminated: "bg-muted text-muted-foreground",
};

export default function Partners() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [businessIdError, setBusinessIdError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    business_id: "",
    address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    contract_status: "active" as ContractStatus,
  });

  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  // Fetch vehicles for cross-search by vehicle number
  const { data: companyVehicles = [] } = useQuery({
    queryKey: ["company-vehicles-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_number, registration_number, company_id")
        .not("company_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "companies")
        .eq("record_id", selectedCompany.id)
        .order("created_at", { ascending: false })
        .limit(10);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Autoilija lisätty onnistuneesti");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error?.message?.includes("companies_name_unique")) {
        toast.error("Tämän niminen yritys on jo järjestelmässä");
        setNameError("Yritys on jo järjestelmässä");
      } else if (error?.message?.includes("companies_business_id_unique")) {
        toast.error("Tällä Y-tunnuksella on jo yritys järjestelmässä");
        setBusinessIdError("Y-tunnus on jo käytössä");
      } else {
        toast.error("Virhe lisättäessä autoilijaa");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Autoilija päivitetty onnistuneesti");
      setSelectedCompany(null);
      resetForm();
    },
    onError: (error: any) => {
      if (error?.message?.includes("companies_name_unique")) {
        toast.error("Tämän niminen yritys on jo järjestelmässä");
        setNameError("Yritys on jo järjestelmässä");
      } else if (error?.message?.includes("companies_business_id_unique")) {
        toast.error("Tällä Y-tunnuksella on jo yritys järjestelmässä");
        setBusinessIdError("Y-tunnus on jo käytössä");
      } else {
        toast.error("Virhe päivitettäessä autoilijaa");
      }
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      business_id: "",
      address: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      contract_status: "active",
    });
    setNameError(null);
    setBusinessIdError(null);
  };

  // Check for duplicate name/business_id in real-time
  const checkDuplicateName = (name: string) => {
    const trimmedName = name.trim().toLowerCase();
    const existingCompany = companies.find(
      (c) => c.name.toLowerCase() === trimmedName && c.id !== selectedCompany?.id
    );
    if (existingCompany) {
      setNameError("Tämän niminen yritys on jo järjestelmässä");
    } else {
      setNameError(null);
    }
  };

  const checkDuplicateBusinessId = (businessId: string) => {
    if (!businessId.trim()) {
      setBusinessIdError(null);
      return;
    }
    const existingCompany = companies.find(
      (c) => c.business_id === businessId.trim() && c.id !== selectedCompany?.id
    );
    if (existingCompany) {
      setBusinessIdError("Tällä Y-tunnuksella on jo yritys järjestelmässä");
    } else {
      setBusinessIdError(null);
    }
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      business_id: company.business_id || "",
      address: company.address || "",
      contact_person: company.contact_person || "",
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      contract_status: company.contract_status || "active",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Don't submit if there are validation errors
    if (nameError || businessIdError) {
      toast.error("Korjaa lomakkeen virheet ennen tallentamista");
      return;
    }
    if (selectedCompany) {
      updateMutation.mutate({ id: selectedCompany.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    // Direct field matches
    const directMatch =
      company.name.toLowerCase().includes(query) ||
      company.business_id?.toLowerCase().includes(query) ||
      company.contact_person?.toLowerCase().includes(query) ||
      company.contact_email?.toLowerCase().includes(query) ||
      company.contact_phone?.toLowerCase().includes(query) ||
      company.address?.toLowerCase().includes(query);
    if (directMatch) return true;
    // Vehicle cross-search
    const vehicleMatch = companyVehicles.some(
      (v) => v.company_id === company.id && (
        v.vehicle_number.toLowerCase().includes(query) ||
        v.registration_number.toLowerCase().includes(query)
      )
    );
    return vehicleMatch;
  });

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData: paginatedCompanies,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredCompanies);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Autoilijat</h1>
            <p className="text-muted-foreground mt-1">
              Hallitse sopimusyrityksiä ja autoilijoita
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Lisää autoilija
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lisää uusi autoilija</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Yrityksen nimi *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        checkDuplicateName(e.target.value);
                      }}
                      onBlur={() => checkDuplicateName(formData.name)}
                      className={nameError ? "border-destructive" : ""}
                      required
                    />
                    {nameError && (
                      <p className="text-sm text-destructive mt-1">{nameError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="business_id">Y-tunnus</Label>
                    <Input
                      id="business_id"
                      value={formData.business_id}
                      onChange={(e) => {
                        setFormData({ ...formData, business_id: e.target.value });
                        checkDuplicateBusinessId(e.target.value);
                      }}
                      onBlur={() => checkDuplicateBusinessId(formData.business_id)}
                      className={businessIdError ? "border-destructive" : ""}
                      placeholder="1234567-8"
                    />
                    {businessIdError && (
                      <p className="text-sm text-destructive mt-1">{businessIdError}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Osoite</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contact_person">Yhteyshenkilö</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_person: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Puhelin</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contact_email">Sähköposti</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contract_status">Sopimuksen tila</Label>
                    <Select
                      value={formData.contract_status}
                      onValueChange={(value: ContractStatus) =>
                        setFormData({ ...formData, contract_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiivinen</SelectItem>
                        <SelectItem value="pending">Odottaa</SelectItem>
                        <SelectItem value="expired">Vanhentunut</SelectItem>
                        <SelectItem value="terminated">Päättynyt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Peruuta
                  </Button>
                  <Button type="submit">Tallenna</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hae nimellä, Y-tunnuksella, yhteyshenkilöllä, autonumerolla, osoitteella..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Partners Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Sopimusyritykset ({filteredCompanies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ladataan...
              </div>
            ) : paginatedCompanies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ei autoilijoita
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Yritys</TableHead>
                      <TableHead>Y-tunnus</TableHead>
                      <TableHead>Yhteyshenkilö</TableHead>
                      <TableHead>Puhelin</TableHead>
                      <TableHead>Sopimus</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.business_id || "—"}</TableCell>
                        <TableCell>{company.contact_person || "—"}</TableCell>
                        <TableCell>{company.contact_phone || "—"}</TableCell>
                        <TableCell>
                          {company.contract_status && (
                            <Badge
                              className={contractStatusColors[company.contract_status]}
                            >
                              {contractStatusLabels[company.contract_status]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/autoilijat/${company.id}`)}
                              title="Avaa profiili"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(company)}
                            >
                              Muokkaa
                            </Button>
                          </div>
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

        {/* Edit Dialog */}
        <Dialog
          open={!!selectedCompany}
          onOpenChange={(open) => !open && setSelectedCompany(null)}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Muokkaa autoilijaa: {selectedCompany?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-name">Yrityksen nimi *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      checkDuplicateName(e.target.value);
                    }}
                    onBlur={() => checkDuplicateName(formData.name)}
                    className={nameError ? "border-destructive" : ""}
                    required
                  />
                  {nameError && (
                    <p className="text-sm text-destructive mt-1">{nameError}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-business_id">Y-tunnus</Label>
                  <Input
                    id="edit-business_id"
                    value={formData.business_id}
                    onChange={(e) => {
                      setFormData({ ...formData, business_id: e.target.value });
                      checkDuplicateBusinessId(e.target.value);
                    }}
                    onBlur={() => checkDuplicateBusinessId(formData.business_id)}
                    className={businessIdError ? "border-destructive" : ""}
                  />
                  {businessIdError && (
                    <p className="text-sm text-destructive mt-1">{businessIdError}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-address">Osoite</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-contact_person">Yhteyshenkilö</Label>
                  <Input
                    id="edit-contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact_phone">Puhelin</Label>
                  <Input
                    id="edit-contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-contact_email">Sähköposti</Label>
                  <Input
                    id="edit-contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contract_status">Sopimuksen tila</Label>
                  <Select
                    value={formData.contract_status}
                    onValueChange={(value: ContractStatus) =>
                      setFormData({ ...formData, contract_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiivinen</SelectItem>
                      <SelectItem value="pending">Odottaa</SelectItem>
                      <SelectItem value="expired">Vanhentunut</SelectItem>
                      <SelectItem value="terminated">Päättynyt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Audit Log Section */}
              {auditLogs.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <History className="h-4 w-4" />
                    Muutoshistoria
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="text-sm p-2 bg-muted rounded-lg"
                      >
                        <span className="font-medium">
                          {log.action === "create"
                            ? "Luotu"
                            : log.action === "update"
                            ? "Päivitetty"
                            : "Poistettu"}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(log.created_at).toLocaleString("fi-FI")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCompany(null)}
                >
                  Peruuta
                </Button>
                <Button type="submit">Tallenna muutokset</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
