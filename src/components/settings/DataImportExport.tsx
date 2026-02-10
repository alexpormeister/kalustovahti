import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Database, Download, Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ExportTable = "vehicles" | "companies" | "hardware_devices" | "profiles";

const tableLabels: Record<ExportTable, string> = {
  vehicles: "Ajoneuvot",
  companies: "Yritykset",
  hardware_devices: "Laitteet",
  profiles: "Käyttäjäprofiilit",
};

const exportColumns: Record<ExportTable, string[]> = {
  vehicles: ["vehicle_number", "registration_number", "brand", "model", "status", "meter_serial_number", "payment_terminal_id"],
  companies: ["name", "business_id", "address", "contact_person", "contact_email", "contact_phone", "contract_status"],
  hardware_devices: ["serial_number", "device_type", "sim_number", "status", "description"],
  profiles: ["full_name", "phone", "driver_number", "driver_license_valid_until"],
};

const columnLabels: Record<string, string> = {
  vehicle_number: "Autonumero",
  registration_number: "Rekisterinumero",
  brand: "Merkki",
  model: "Malli",
  status: "Tila",
  meter_serial_number: "Mittarin sarjanumero",
  payment_terminal_id: "Maksupääte-ID",
  name: "Nimi",
  business_id: "Y-tunnus",
  address: "Osoite",
  contact_person: "Yhteyshenkilö",
  contact_email: "Sähköposti",
  contact_phone: "Puhelin",
  contract_status: "Sopimustila",
  serial_number: "Sarjanumero",
  device_type: "Laitetyyppi",
  sim_number: "SIM-numero",
  description: "Kuvaus",
  full_name: "Nimi",
  phone: "Puhelin",
  driver_number: "Kuljettajanumero",
  driver_license_valid_until: "Ajokortti voimassa",
};

interface ImportPreviewData {
  headers: string[];
  rows: string[][];
  mappings: Record<string, string>;
}

export function DataImportExport({ isAdmin }: { isAdmin: boolean }) {
  const [selectedExportTable, setSelectedExportTable] = useState<ExportTable>("vehicles");
  const [selectedImportTable, setSelectedImportTable] = useState<ExportTable>("vehicles");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from(selectedExportTable)
        .select("*");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Ei dataa vietäväksi");
        return;
      }

      const columns = exportColumns[selectedExportTable];
      const headers = columns.map(col => columnLabels[col] || col);
      
      const csvContent = [
        headers.join(";"),
        ...data.map(row => 
          columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains semicolon or newline
            if (stringValue.includes(";") || stringValue.includes("\n") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(";")
        )
      ].join("\n");

      // Add BOM for Excel UTF-8 support
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableLabels[selectedExportTable]}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} riviä viety onnistuneesti`);
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
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("Tiedostossa ei ole tarpeeksi rivejä");
        return;
      }

      // Parse CSV with semicolon delimiter
      const parseCSVLine = (line: string): string[] => {
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
          } else if (char === ";" && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1, 6).map(parseCSVLine); // Preview first 5 rows

      // Auto-map columns
      const targetColumns = exportColumns[selectedImportTable];
      const mappings: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        // Find matching target column
        for (const [colKey, colLabel] of Object.entries(columnLabels)) {
          if (
            targetColumns.includes(colKey) &&
            (normalizedHeader === colLabel.toLowerCase() || normalizedHeader === colKey.toLowerCase())
          ) {
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      if (!importFileContent) {
        toast.error("Tiedoston sisältö puuttuu. Valitse tiedosto uudelleen.");
        return;
      }

      const text = importFileContent;
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      const parseCSVLine = (line: string): string[] => {
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
          } else if (char === ";" && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const dataRows = lines.slice(1).map(parseCSVLine);
      let success = 0;
      let failed = 0;

      for (const row of dataRows) {
        try {
          const record: Record<string, string | null> = {};
          
          Object.entries(importPreview.mappings).forEach(([sourceIndex, targetColumn]) => {
            const value = row[parseInt(sourceIndex)];
            record[targetColumn] = value?.trim() || null;
          });

          // Skip empty rows
          if (Object.values(record).every(v => !v)) {
            continue;
          }

          // Type assertion needed for dynamic table inserts
          const { error } = await supabase
            .from(selectedImportTable)
            .insert(record as any);

          if (error) {
            console.error("Insert error:", error);
            failed++;
          } else {
            success++;
          }
        } catch (e) {
          console.error("Row error:", e);
          failed++;
        }
      }

      setImportResults({ success, failed });
      
      if (success > 0) {
        toast.success(`${success} riviä tuotu onnistuneesti`);
      }
      if (failed > 0) {
        toast.error(`${failed} riviä epäonnistui`);
      }
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

  if (!isAdmin) {
    return (
      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Datan tuonti ja vienti</CardTitle>
              <CardDescription>CSV-tiedostojen tuonti ja vienti</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vain pääkäyttäjät voivat tuoda ja viedä dataa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Datan tuonti ja vienti</CardTitle>
              <CardDescription>CSV-tiedostojen tuonti ja vienti järjestelmästä</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Section */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Vie dataa
              </h4>
              <p className="text-sm text-muted-foreground">
                Vie valitun taulukon data CSV-tiedostoksi.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="export-table">Valitse taulukko</Label>
                  <Select
                    value={selectedExportTable}
                    onValueChange={(value: ExportTable) => setSelectedExportTable(value)}
                  >
                    <SelectTrigger id="export-table">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tableLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Vie CSV-tiedostona
                </Button>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Tuo dataa
              </h4>
              <p className="text-sm text-muted-foreground">
                Tuo dataa CSV-tiedostosta. Sarakkeet yhdistetään automaattisesti.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="import-table">Valitse kohdetaulukko</Label>
                  <Select
                    value={selectedImportTable}
                    onValueChange={(value: ExportTable) => setSelectedImportTable(value)}
                  >
                    <SelectTrigger id="import-table">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tableLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Valitse CSV-tiedosto
                </Button>
              </div>
            </div>
          </div>

          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              CSV-tiedoston tulee käyttää puolipistettä (;) erottimena. Ensimmäinen rivi käsitellään otsikkorivinä.
              Tiedoston tulee olla UTF-8-koodattu.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Tuonnin esikatselu - {tableLabels[selectedImportTable]}</DialogTitle>
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
                          {exportColumns[selectedImportTable].map((col) => (
                            <SelectItem key={col} value={col}>
                              {columnLabels[col] || col}
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
                                → {columnLabels[importPreview.mappings[String(i)]]}
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
