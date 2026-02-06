import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SystemSettingsData {
  companyName: string;
  companyBusinessId: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

interface SystemSettingsProps {
  isAdmin: boolean;
}

export function SystemSettings({ isAdmin }: SystemSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettingsData>({
    companyName: "",
    companyBusinessId: "",
    companyAddress: "",
    companyEmail: "",
    companyPhone: "",
    invoicePrefix: "INV-",
    invoiceFooter: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("systemSettings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse system settings:", e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    localStorage.setItem("systemSettings", JSON.stringify(settings));
    toast.success("Järjestelmäasetukset tallennettu");
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!isAdmin) {
    return (
      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Järjestelmä</CardTitle>
              <CardDescription>Yleiset järjestelmäasetukset</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vain pääkäyttäjät voivat muokata järjestelmäasetuksia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Järjestelmä</CardTitle>
              <CardDescription>Yrityksen tiedot ja laskutusasetukset</CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Muokkaa
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Yrityksen tiedot</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="company-name">Yrityksen nimi</Label>
                  <Input
                    id="company-name"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    placeholder="Lähitaksi Oy"
                  />
                </div>
                <div>
                  <Label htmlFor="company-bid">Y-tunnus</Label>
                  <Input
                    id="company-bid"
                    value={settings.companyBusinessId}
                    onChange={(e) => setSettings({ ...settings, companyBusinessId: e.target.value })}
                    placeholder="1234567-8"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="company-address">Osoite</Label>
                  <Input
                    id="company-address"
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    placeholder="Esimerkkikatu 1, 00100 Helsinki"
                  />
                </div>
                <div>
                  <Label htmlFor="company-email">Sähköposti</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    placeholder="info@lahitaksi.fi"
                  />
                </div>
                <div>
                  <Label htmlFor="company-phone">Puhelin</Label>
                  <Input
                    id="company-phone"
                    value={settings.companyPhone}
                    onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    placeholder="+358 9 123 4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Laskutusasetukset</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="invoice-prefix">Laskunumeron etuliite</Label>
                  <Input
                    id="invoice-prefix"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    placeholder="INV-"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="invoice-footer">Laskun alatunniste</Label>
                  <Textarea
                    id="invoice-footer"
                    value={settings.invoiceFooter}
                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                    placeholder="Maksuehto 14 pv netto. Viivästyskorko 8%."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Tallenna
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Peruuta
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Yrityksen tiedot</h4>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Nimi</p>
                  <p className="font-medium">{settings.companyName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Y-tunnus</p>
                  <p className="font-medium">{settings.companyBusinessId || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Osoite</p>
                  <p className="font-medium">{settings.companyAddress || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sähköposti</p>
                  <p className="font-medium">{settings.companyEmail || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Puhelin</p>
                  <p className="font-medium">{settings.companyPhone || "—"}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Laskutusasetukset</h4>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Laskunumeron etuliite</p>
                  <p className="font-medium">{settings.invoicePrefix || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Alatunniste</p>
                  <p className="font-medium whitespace-pre-wrap">{settings.invoiceFooter || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
