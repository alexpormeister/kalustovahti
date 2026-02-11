import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface CompanyInfo {
  name: string;
  business_id: string;
  email: string;
  phone: string;
  address: string;
  billing_info: string;
}

const defaultInfo: CompanyInfo = {
  name: "", business_id: "", email: "", phone: "", address: "", billing_info: "",
};

export function CompanyInfoManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [info, setInfo] = useState<CompanyInfo>(defaultInfo);

  useEffect(() => {
    const saved = localStorage.getItem("companyInfo");
    if (saved) {
      try { setInfo({ ...defaultInfo, ...JSON.parse(saved) }); } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("companyInfo", JSON.stringify(info));
    toast.success("Yritystiedot tallennettu");
    setIsEditing(false);
  };

  return (
    <Card className="glass-card md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Yritystiedot
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />Muokkaa
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" />Peruuta
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />Tallenna
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Yrityksen nimi</Label><Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Kalustovahti Oy" /></div>
            <div><Label>Y-tunnus</Label><Input value={info.business_id} onChange={(e) => setInfo({ ...info, business_id: e.target.value })} placeholder="1234567-8" /></div>
            <div><Label>Sähköposti</Label><Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="info@yritys.fi" /></div>
            <div><Label>Puhelin</Label><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="+358 9 123 4567" /></div>
            <div className="sm:col-span-2"><Label>Osoite</Label><Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="Esimerkkikatu 1, 00100 Helsinki" /></div>
            <div className="sm:col-span-2"><Label>Laskutustiedot</Label><Input value={info.billing_info} onChange={(e) => setInfo({ ...info, billing_info: e.target.value })} placeholder="Verkkolaskuosoite, välittäjätunnus..." /></div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Nimi</p><p className="font-medium">{info.name || "—"}</p></div>
            <div><p className="text-muted-foreground">Y-tunnus</p><p className="font-medium">{info.business_id || "—"}</p></div>
            <div><p className="text-muted-foreground">Sähköposti</p><p className="font-medium">{info.email || "—"}</p></div>
            <div><p className="text-muted-foreground">Puhelin</p><p className="font-medium">{info.phone || "—"}</p></div>
            <div className="sm:col-span-2"><p className="text-muted-foreground">Osoite</p><p className="font-medium">{info.address || "—"}</p></div>
            <div className="sm:col-span-2"><p className="text-muted-foreground">Laskutustiedot</p><p className="font-medium">{info.billing_info || "—"}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
