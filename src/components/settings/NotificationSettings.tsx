import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationPreferences {
  emailMaintenanceReminders: boolean;
  emailLicenseExpiry: boolean;
  emailContractChanges: boolean;
  emailDeviceStatus: boolean;
}

export function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailMaintenanceReminders: true,
    emailLicenseExpiry: true,
    emailContractChanges: false,
    emailDeviceStatus: false,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("notificationPreferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse notification preferences:", e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    localStorage.setItem("notificationPreferences", JSON.stringify(preferences));
    toast.success("Ilmoitusasetukset tallennettu");
    setIsSaving(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Ilmoitukset</CardTitle>
            <CardDescription>Sähköposti-ilmoitusasetukset</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance">Huoltomuistutukset</Label>
              <p className="text-sm text-muted-foreground">
                Ilmoitukset ajoneuvojen huoltoajankohdista
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={preferences.emailMaintenanceReminders}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, emailMaintenanceReminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="license">Ajokorttien vanhentuminen</Label>
              <p className="text-sm text-muted-foreground">
                Ilmoitus kun kuljettajan ajokortti on vanhentumassa
              </p>
            </div>
            <Switch
              id="license"
              checked={preferences.emailLicenseExpiry}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, emailLicenseExpiry: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="contract">Sopimusmuutokset</Label>
              <p className="text-sm text-muted-foreground">
                Ilmoitukset sopimustilan muutoksista
              </p>
            </div>
            <Switch
              id="contract"
              checked={preferences.emailContractChanges}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, emailContractChanges: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="device">Laitteiden tila</Label>
              <p className="text-sm text-muted-foreground">
                Ilmoitukset laitteiden tilamuutoksista (rikki, huollossa)
              </p>
            </div>
            <Switch
              id="device"
              checked={preferences.emailDeviceStatus}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, emailDeviceStatus: checked })
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Tallenna asetukset
        </Button>
      </CardContent>
    </Card>
  );
}
