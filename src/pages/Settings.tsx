import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Clock, Building2 } from "lucide-react";

// Simple i18n
const translations: Record<string, Record<string, string>> = {
  fi: {
    settings: "Asetukset",
    settingsDesc: "Hallitse järjestelmän asetuksia",
    language: "Kieli",
    languageDesc: "Käyttöliittymän kieli",
    timezone: "Aikavyöhyke",
    timezoneDesc: "Kellonaikaformaatti",
    companyInfo: "Yritystiedot",
    companyInfoDesc: "Yrityksen perustiedot (muokattavissa ylläpidossa)",
    companyName: "Nimi",
    businessId: "Y-tunnus",
    contactEmail: "Sähköposti",
    contactPhone: "Puhelin",
    address: "Osoite",
    notSet: "Ei asetettu",
    finnish: "Suomi",
    english: "English",
    swedish: "Svenska",
  },
  en: {
    settings: "Settings",
    settingsDesc: "Manage system settings",
    language: "Language",
    languageDesc: "User interface language",
    timezone: "Timezone",
    timezoneDesc: "Time format",
    companyInfo: "Company Information",
    companyInfoDesc: "Company details (editable in Maintenance)",
    companyName: "Name",
    businessId: "Business ID",
    contactEmail: "Email",
    contactPhone: "Phone",
    address: "Address",
    notSet: "Not set",
    finnish: "Suomi",
    english: "English",
    swedish: "Svenska",
  },
  sv: {
    settings: "Inställningar",
    settingsDesc: "Hantera systeminställningar",
    language: "Språk",
    languageDesc: "Gränssnittsspråk",
    timezone: "Tidszon",
    timezoneDesc: "Tidsformat",
    companyInfo: "Företagsinformation",
    companyInfoDesc: "Företagsuppgifter (redigerbara i Underhåll)",
    companyName: "Namn",
    businessId: "FO-nummer",
    contactEmail: "E-post",
    contactPhone: "Telefon",
    address: "Adress",
    notSet: "Ej angiven",
    finnish: "Suomi",
    english: "English",
    swedish: "Svenska",
  },
};

export default function Settings() {
  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "fi");
  const [timeFormat, setTimeFormat] = useState(() => localStorage.getItem("app_time_format") || "24h");
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const t = translations[language] || translations.fi;

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("app_time_format", timeFormat);
  }, [timeFormat]);

  // Load company info from localStorage (set by maintenance page)
  useEffect(() => {
    const saved = localStorage.getItem("companyInfo");
    if (saved) {
      try { setCompanyInfo(JSON.parse(saved)); } catch {}
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.settings}</h1>
          <p className="text-muted-foreground mt-1">{t.settingsDesc}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ProfileSettings />

          {/* Language */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.language}</CardTitle>
                  <CardDescription>{t.languageDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fi">🇫🇮 {t.finnish}</SelectItem>
                  <SelectItem value="en">🇬🇧 {t.english}</SelectItem>
                  <SelectItem value="sv">🇸🇪 {t.swedish}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Time format */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.timezone}</CardTitle>
                  <CardDescription>{t.timezoneDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24h (14:30)</SelectItem>
                  <SelectItem value="12h">12h (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Company info (read-only) */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.companyInfo}</CardTitle>
                  <CardDescription>{t.companyInfoDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div><p className="text-muted-foreground">{t.companyName}</p><p className="font-medium">{companyInfo?.name || t.notSet}</p></div>
                <div><p className="text-muted-foreground">{t.businessId}</p><p className="font-medium">{companyInfo?.business_id || t.notSet}</p></div>
                <div><p className="text-muted-foreground">{t.contactEmail}</p><p className="font-medium">{companyInfo?.email || t.notSet}</p></div>
                <div><p className="text-muted-foreground">{t.contactPhone}</p><p className="font-medium">{companyInfo?.phone || t.notSet}</p></div>
                <div className="sm:col-span-2"><p className="text-muted-foreground">{t.address}</p><p className="font-medium">{companyInfo?.address || t.notSet}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
