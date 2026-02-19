import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TableConfig {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
}

const allTables: TableConfig[] = [
  {
    key: "vehicles",
    label: "Ajoneuvot",
    columns: [
      { key: "vehicle_number", label: "Autonumero" },
      { key: "registration_number", label: "Rekisterinumero" },
      { key: "brand", label: "Merkki" },
      { key: "model", label: "Malli" },
      { key: "year_model", label: "Vuosimalli" },
      { key: "fuel_type", label: "Käyttövoima" },
      { key: "co2_emissions", label: "CO2-päästöt (g/km)" },
      { key: "status", label: "Tila" },
      { key: "city", label: "Kaupunki" },
      { key: "meter_serial_number", label: "Mittarin sarjanumero" },
      { key: "payment_terminal_id", label: "Maksupääte-ID" },
    ],
  },
  {
    key: "companies",
    label: "Yritykset",
    columns: [
      { key: "name", label: "Nimi" },
      { key: "business_id", label: "Y-tunnus" },
      { key: "address", label: "Osoite" },
      { key: "contact_person", label: "Yhteyshenkilö" },
      { key: "contact_email", label: "Sähköposti" },
      { key: "contact_phone", label: "Puhelin" },
      { key: "contract_status", label: "Sopimustila" },
    ],
  },
  {
    key: "drivers",
    label: "Kuljettajat",
    columns: [
      { key: "driver_number", label: "Kuljettajanumero" },
      { key: "full_name", label: "Nimi" },
      { key: "phone", label: "Puhelin" },
      { key: "email", label: "Sähköposti" },
      { key: "city", label: "Kaupunki" },
      { key: "province", label: "Maakunta" },
      { key: "status", label: "Tila" },
      { key: "driver_license_valid_until", label: "Ajokortti voimassa" },
    ],
  },
  {
    key: "hardware_devices",
    label: "Laitteet",
    columns: [
      { key: "serial_number", label: "Sarjanumero" },
      { key: "device_type", label: "Laitetyyppi" },
      { key: "sim_number", label: "SIM-numero" },
      { key: "status", label: "Tila" },
      { key: "description", label: "Kuvaus" },
    ],
  },
  {
    key: "quality_incidents",
    label: "Laatupoikkeamat",
    columns: [
      { key: "incident_date", label: "Päivämäärä" },
      { key: "incident_type", label: "Tyyppi" },
      { key: "description", label: "Kuvaus" },
      { key: "action_taken", label: "Toimenpiteet" },
      { key: "status", label: "Tila" },
      { key: "source", label: "Lähde" },
      { key: "driver_name", label: "Kuljettaja" },
      { key: "driver_number", label: "Kuljettajanumero" },
      { key: "vehicle_number", label: "Autonumero" },
      { key: "vehicle_registration", label: "Rekisterinumero" },
    ],
  },
];

// Field value documentation for import guidance
const fieldValueDocs: Record<string, Record<string, string>> = {
  vehicles: {
    status: "active = Aktiivinen, inactive = Ei käytössä, maintenance = Huollossa",
    fuel_type: "Bensiini, Diesel, Sähkö, Hybridi, Kaasu",
  },
  companies: {
    contract_status: "active = Aktiivinen, inactive = Ei aktiivinen, pending = Odottaa",
  },
  drivers: {
    status: "active = Aktiivinen, inactive = Ei aktiivinen",
    driver_license_valid_until: "Muoto: VVVV-KK-PP (esim. 2026-12-31)",
  },
  hardware_devices: {
    device_type: "Tekninen avain ylläpidossa määritellyistä laitetyypeistä (esim. payment_terminal, sim_card, tablet)",
    status: "available = Vapaana, installed = Asennettu, maintenance = Huollossa, decommissioned = Poistettu käytöstä",
  },
  quality_incidents: {
    incident_type: "customer_complaint = Asiakasvalitus, service_quality = Palvelun laatu, vehicle_condition = Ajoneuvon kunto, driver_behavior = Kuljettajan käytös, safety_issue = Turvallisuus, billing_issue = Laskutus, other = Muu",
    status: "new = Uusi, investigating = Tutkinnassa, resolved = Ratkaistu, closed = Suljettu",
    incident_date: "Muoto: VVVV-KK-PP (esim. 2026-02-19)",
  },
};

// Build column labels map from allTables
const columnLabelsMap: Record<string, Record<string, string>> = {};
allTables.forEach((t) => {
  const map: Record<string, string> = {};
  t.columns.forEach((c) => { map[c.key] = c.label; });
  columnLabelsMap[t.key] = map;
});

interface ImportPreviewData {
  headers: string[];
  rows: string[][];
  mappings: Record<string, string>;
}

function parseCSVLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function DataImportExport({ isAdmin }: { isAdmin: boolean }) {
  // Export state
  const [selectedExportTables, setSelectedExportTables] = useState<Set<string>>(new Set(["vehicles"]));
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [selectedImportTable, setSelectedImportTable] = useState(allTables[0].key);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Vain pääkäyttäjät voivat tuoda ja viedä dataa.
      </p>
    );
  }

  const toggleExportTable = (key: string) => {
    setSelectedExportTables((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllExport = () => {
    setSelectedExportTables(new Set(allTables.map((t) => t.key)));
  };

  const deselectAllExport = () => {
    setSelectedExportTables(new Set());
  };

  const handleExport = async () => {
    if (selectedExportTables.size === 0) {
      toast.error("Valitse vähintään yksi taulukko");
      return;
    }

    setIsExporting(true);
    let exportedCount = 0;

    try {
      for (const tableKey of selectedExportTables) {
        const tableConfig = allTables.find((t) => t.key === tableKey);
        if (!tableConfig) continue;

        const { data, error } = await supabase.from(tableKey as any).select("*");
        if (error) {
          console.error(`Export error for ${tableKey}:`, error);
          toast.error(`Virhe vietäessä: ${tableConfig.label}`);
          continue;
        }

        if (!data || data.length === 0) continue;

        // For quality_incidents, enrich with driver/vehicle data
        let enrichedData = data as any[];
        if (tableKey === "quality_incidents") {
          // Fetch drivers and vehicles for lookups
          const driverIds = [...new Set(enrichedData.filter(r => r.driver_id).map(r => r.driver_id))];
          const vehicleIds = [...new Set(enrichedData.filter(r => r.vehicle_id).map(r => r.vehicle_id))];

          let driversMap: Record<string, any> = {};
          let vehiclesMap: Record<string, any> = {};

          if (driverIds.length > 0) {
            const { data: drivers } = await supabase.from("drivers").select("id, full_name, driver_number").in("id", driverIds);
            (drivers || []).forEach((d: any) => { driversMap[d.id] = d; });
          }
          if (vehicleIds.length > 0) {
            const { data: vehicles } = await supabase.from("vehicles").select("id, vehicle_number, registration_number").in("id", vehicleIds);
            (vehicles || []).forEach((v: any) => { vehiclesMap[v.id] = v; });
          }

          enrichedData = enrichedData.map((row: any) => ({
            ...row,
            driver_name: driversMap[row.driver_id]?.full_name || "",
            driver_number: driversMap[row.driver_id]?.driver_number || "",
            vehicle_number: vehiclesMap[row.vehicle_id]?.vehicle_number || "",
            vehicle_registration: vehiclesMap[row.vehicle_id]?.registration_number || "",
          }));
        }

        const columns = tableConfig.columns.map((c) => c.key);
        const headers = tableConfig.columns.map((c) => c.label);

        const csvContent = [
          headers.join(";"),
          ...enrichedData.map((row: any) =>
            columns
              .map((col) => {
                const value = row[col];
                if (value === null || value === undefined) return "";
                const str = String(value);
                if (str.includes(";") || str.includes("\n") || str.includes('"')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              })
              .join(";")
          ),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableConfig.label}_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exportedCount++;
      }

      if (exportedCount > 0) {
        toast.success(`${exportedCount} taulukkoa viety onnistuneesti`);
      } else {
        toast.error("Ei dataa vietäväksi valituista taulukoista");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Virhe viennissä");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error("Tiedostossa ei ole tarpeeksi rivejä");
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1, 6).map((l) => parseCSVLine(l));

      const tableConfig = allTables.find((t) => t.key === selectedImportTable);
      const targetColumns = tableConfig?.columns.map((c) => c.key) || [];
      const colLabels = columnLabelsMap[selectedImportTable] || {};

      const mappings: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().trim();
        for (const colKey of targetColumns) {
          const label = colLabels[colKey]?.toLowerCase() || "";
          if (normalized === label || normalized === colKey.toLowerCase()) {
            mappings[String(index)] = colKey;
            break;
          }
        }
      });

      setImportPreview({ headers, rows, mappings });
      setImportFileContent(text);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("File parse error:", error);
      toast.error("Virhe tiedoston lukemisessa");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateRecord = (record: Record<string, string | null>, tableKey: string): string | null => {
    // Length validation
    for (const [key, value] of Object.entries(record)) {
      if (value && value.length > 500) {
        return `Kenttä "${key}" on liian pitkä (max 500 merkkiä)`;
      }
    }

    // Table-specific validation
    if (tableKey === "vehicles") {
      if (record.vehicle_number && !/^\d+$/.test(record.vehicle_number)) {
        return "Autonumero saa sisältää vain numeroita";
      }
    }
    if (tableKey === "companies") {
      if (record.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.contact_email)) {
        return `Virheellinen sähköposti: ${record.contact_email}`;
      }
    }
    if (tableKey === "drivers") {
      if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
        return `Virheellinen sähköposti: ${record.email}`;
      }
      if (record.driver_license_valid_until && isNaN(Date.parse(record.driver_license_valid_until))) {
        return `Virheellinen päivämäärä: ${record.driver_license_valid_until}`;
      }
    }

    return null;
  };

  const handleImport = async () => {
    if (!importPreview || !importFileContent) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const lines = importFileContent.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length > 10001) {
        toast.error("Tiedostossa on liian monta riviä (max 10 000)");
        setIsImporting(false);
        return;
      }
      const dataRows = lines.slice(1).map((l) => parseCSVLine(l));
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // For quality_incidents, pre-fetch lookups and get current user
      let driversLookup: Record<string, string> = {};
      let vehiclesLookup: Record<string, string> = {};
      let currentUserId: string | null = null;

      if (selectedImportTable === "quality_incidents") {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id || null;
        if (!currentUserId) {
          toast.error("Käyttäjä ei ole kirjautunut sisään");
          setIsImporting(false);
          return;
        }

        const { data: drivers } = await supabase.from("drivers").select("id, full_name, driver_number");
        (drivers || []).forEach((d: any) => {
          if (d.full_name) driversLookup[d.full_name.toLowerCase()] = d.id;
          if (d.driver_number) driversLookup[d.driver_number.toLowerCase()] = d.id;
        });

        const { data: vehicles } = await supabase.from("vehicles").select("id, vehicle_number, registration_number");
        (vehicles || []).forEach((v: any) => {
          if (v.vehicle_number) vehiclesLookup[v.vehicle_number.toLowerCase()] = v.id;
          if (v.registration_number) vehiclesLookup[v.registration_number.toLowerCase()] = v.id;
        });
      }

      for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
        const row = dataRows[rowIdx];
        const rowNum = rowIdx + 2; // +2 for header row + 1-indexed
        try {
          const record: Record<string, string | null> = {};
          Object.entries(importPreview.mappings).forEach(([sourceIndex, targetColumn]) => {
            const value = row[parseInt(sourceIndex)];
            record[targetColumn] = value?.trim() || null;
          });

          if (Object.values(record).every((v) => !v)) continue;

          const validationError = validateRecord(record, selectedImportTable);
          if (validationError) {
            errors.push(`Rivi ${rowNum}: ${validationError}`);
            failed++;
            continue;
          }

          // For quality_incidents, resolve names to IDs and add required fields
          if (selectedImportTable === "quality_incidents") {
            // Resolve driver by name or number
            if (record.driver_name) {
              const driverId = driversLookup[record.driver_name.toLowerCase()];
              if (driverId) record.driver_id = driverId;
            }
            if (record.driver_number && !record.driver_id) {
              const driverId = driversLookup[record.driver_number.toLowerCase()];
              if (driverId) record.driver_id = driverId;
            }
            // Resolve vehicle by number or registration
            if (record.vehicle_number) {
              const vehicleId = vehiclesLookup[record.vehicle_number.toLowerCase()];
              if (vehicleId) record.vehicle_id = vehicleId;
            }
            if (record.vehicle_registration && !record.vehicle_id) {
              const vehicleId = vehiclesLookup[record.vehicle_registration.toLowerCase()];
              if (vehicleId) record.vehicle_id = vehicleId;
            }
            // Add created_by
            record.created_by = currentUserId;

            // Only keep columns that exist in quality_incidents table
            const allowedCols = new Set([
              "incident_date", "incident_type", "description", "action_taken",
              "status", "source", "driver_id", "vehicle_id", "created_by",
            ]);
            for (const key of Object.keys(record)) {
              if (!allowedCols.has(key)) {
                delete record[key];
              }
            }
          }

          const { error } = await supabase.from(selectedImportTable as any).insert(record as any);
          if (error) {
            errors.push(`Rivi ${rowNum}: ${error.message}`);
            failed++;
          } else {
            success++;
          }
        } catch (e: any) {
          errors.push(`Rivi ${rowNum}: ${e?.message || "Tuntematon virhe"}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      if (success > 0) toast.success(`${success} riviä tuotu onnistuneesti`);
      if (failed > 0) toast.error(`${failed} riviä epäonnistui — katso virheraportti`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Virhe tuonnissa");
    } finally {
      setIsImporting(false);
    }
  };

  const updateMapping = (sourceIndex: string, targetColumn: string) => {
    if (!importPreview) return;
    setImportPreview({
      ...importPreview,
      mappings: {
        ...importPreview.mappings,
        [sourceIndex]: targetColumn,
      },
    });
  };

  const importTableConfig = allTables.find((t) => t.key === selectedImportTable);

  return (
    <>
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Vie dataa
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Tuo dataa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Valitse taulukot jotka haluat viedä CSV-tiedostoina. Jokaisesta taulukosta luodaan oma tiedosto.
          </p>

          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={selectAllExport}>
              Valitse kaikki
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllExport}>
              Tyhjennä valinnat
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {allTables.map((table) => (
              <label
                key={table.key}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedExportTables.has(table.key)}
                  onCheckedChange={() => toggleExportTable(table.key)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{table.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({table.columns.length} saraketta)
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleExport} disabled={isExporting || selectedExportTables.size === 0} className="gap-2">
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Vie valitut ({selectedExportTables.size})
            </Button>
            {selectedExportTables.size > 0 && (
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedExportTables).map((key) => {
                  const t = allTables.find((tbl) => tbl.key === key);
                  return t ? (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {t.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tuo dataa CSV-tiedostosta valitsemaasi taulukkoon. Sarakkeet yhdistetään automaattisesti.
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="import-table">Valitse kohdetaulukko</Label>
              <Select value={selectedImportTable} onValueChange={setSelectedImportTable}>
                <SelectTrigger id="import-table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allTables.map((table) => (
                    <SelectItem key={table.key} value={table.key}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importTableConfig && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Sarakkeet: {importTableConfig.columns.map((c) => c.label).join(", ")}
                </div>
                {fieldValueDocs[selectedImportTable] && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-foreground">📖 Kenttien sallitut arvot:</p>
                    {Object.entries(fieldValueDocs[selectedImportTable]).map(([field, doc]) => {
                      const colLabel = importTableConfig.columns.find(c => c.key === field)?.label || field;
                      return (
                        <div key={field} className="text-xs">
                          <span className="font-medium text-foreground">{colLabel}:</span>{" "}
                          <span className="text-muted-foreground">{doc}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Valitse CSV-tiedosto
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              CSV-tiedoston tulee käyttää puolipistettä (;) erottimena. Ensimmäinen rivi käsitellään otsikkorivinä.
              Tiedoston tulee olla UTF-8-koodattu.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Tuonnin esikatselu — {allTables.find((t) => t.key === selectedImportTable)?.label}
            </DialogTitle>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Sarakemappaukset</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Valitse mihin kenttään kukin sarake yhdistetään.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {importPreview.headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm truncate flex-1" title={header}>
                        {header}
                      </span>
                      <Select
                        value={importPreview.mappings[String(index)] || "skip"}
                        onValueChange={(value) => {
                          if (value === "skip") {
                            const newMappings = { ...importPreview.mappings };
                            delete newMappings[String(index)];
                            setImportPreview({ ...importPreview, mappings: newMappings });
                          } else {
                            updateMapping(String(index), value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Ohita" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">— Ohita —</SelectItem>
                          {importTableConfig?.columns.map((col) => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Esikatselu (ensimmäiset 5 riviä)</h4>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {importPreview.headers.map((header, i) => (
                          <TableHead key={i} className="whitespace-nowrap">
                            {header}
                            {importPreview.mappings[String(i)] && (
                              <span className="text-xs text-primary block">
                                → {columnLabelsMap[selectedImportTable]?.[importPreview.mappings[String(i)]] || importPreview.mappings[String(i)]}
                              </span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="truncate max-w-[200px]" title={cell}>
                              {cell || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {importResults && (
                <div className="space-y-2">
                  <Alert variant={importResults.failed > 0 ? "destructive" : "default"}>
                    {importResults.failed > 0 ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      Tuonti valmis: {importResults.success} onnistui, {importResults.failed} epäonnistui.
                    </AlertDescription>
                  </Alert>
                  {importResults.errors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-48 overflow-auto">
                      <p className="text-xs font-medium text-destructive mb-2">Virheet ({importResults.errors.length}):</p>
                      {importResults.errors.slice(0, 50).map((err, i) => (
                        <p key={i} className="text-xs text-destructive/80">{err}</p>
                      ))}
                      {importResults.errors.length > 50 && (
                        <p className="text-xs text-destructive/60 mt-1">...ja {importResults.errors.length - 50} muuta virhettä</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Peruuta
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || Object.keys(importPreview.mappings).length === 0}
                  className="gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Tuo data
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
