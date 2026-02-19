import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Key, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk_live_";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiKeyManager() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [permissions, setPermissions] = useState({ read_drivers: true, read_vehicles: true });
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, key_prefix, label, company_id, permissions, created_by, created_at, last_used_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ei kirjautunut sisään");
      
      const plainKey = generateApiKey();
      const keyHash = await sha256(plainKey);
      const keyPrefix = plainKey.substring(0, 12) + "...";

      const { error } = await supabase.from("api_keys").insert({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label: newLabel,
        company_id: newCompanyId,
        permissions,
        created_by: user.id,
      });

      if (error) throw error;
      return plainKey;
    },
    onSuccess: (plainKey) => {
      setGeneratedKey(plainKey);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setNewLabel("");
      setNewCompanyId("");
      setPermissions({ read_drivers: true, read_vehicles: true });
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API-avain luotu onnistuneesti");
    },
    onError: (error: any) => {
      toast.error("Virhe luotaessa API-avainta: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API-avain poistettu");
      setShowDeleteDialog(false);
      setDeleteKeyId(null);
    },
    onError: (error: any) => {
      toast.error("Virhe poistettaessa: " + error.message);
    },
  });

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name || "Tuntematon";
  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || "Tuntematon";

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("API-avain kopioitu leikepöydälle");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Hallitse API-avaimia ulkoisia integraatioita varten. Avaimet mahdollistavat pääsyn yrityskohtaiseen dataan.
        </p>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Luo uusi API-avain
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Ladataan...</p>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Key className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Ei API-avaimia. Luo ensimmäinen avain painamalla yllä olevaa painiketta.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead>Avain (alku)</TableHead>
                <TableHead>Yritys</TableHead>
                <TableHead>Oikeudet</TableHead>
                <TableHead>Luoja</TableHead>
                <TableHead>Luotu</TableHead>
                <TableHead>Viimeksi käytetty</TableHead>
                <TableHead className="w-[80px]">Toiminnot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => {
                const perms = key.permissions as Record<string, boolean> | null;
                return (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.label}</TableCell>
                    <TableCell className="font-mono text-xs">{key.key_prefix}</TableCell>
                    <TableCell>{getCompanyName(key.company_id)}</TableCell>
                    <TableCell className="text-xs">
                      {perms?.read_drivers && "Kuljettajat"}
                      {perms?.read_drivers && perms?.read_vehicles && ", "}
                      {perms?.read_vehicles && "Autot"}
                    </TableCell>
                    <TableCell>{getProfileName(key.created_by)}</TableCell>
                    <TableCell>{format(new Date(key.created_at), "d.M.yyyy HH:mm", { locale: fi })}</TableCell>
                    <TableCell>
                      {key.last_used_at
                        ? format(new Date(key.last_used_at), "d.M.yyyy HH:mm", { locale: fi })
                        : "Ei käytetty"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteKeyId(key.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luo uusi API-avain</DialogTitle>
            <DialogDescription>
              Anna avaimelle nimi ja valitse yritys, jonka dataan avain antaa pääsyn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nimi / Kuvaus</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="esim. Kolmannen osapuolen integraatio"
              />
            </div>
            <div>
              <Label>Yritys</Label>
              <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse yritys" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Oikeudet</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm_drivers"
                  checked={permissions.read_drivers}
                  onCheckedChange={(v) => setPermissions((p) => ({ ...p, read_drivers: !!v }))}
                />
                <label htmlFor="perm_drivers" className="text-sm">Kuljettajatiedot</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm_vehicles"
                  checked={permissions.read_vehicles}
                  onCheckedChange={(v) => setPermissions((p) => ({ ...p, read_vehicles: !!v }))}
                />
                <label htmlFor="perm_vehicles" className="text-sm">Autotiedot</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Peruuta</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newLabel || !newCompanyId || createMutation.isPending}
            >
              {createMutation.isPending ? "Luodaan..." : "Luo avain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Key Dialog (one time only) */}
      <Dialog open={showKeyDialog} onOpenChange={(open) => { if (!open) { setGeneratedKey(""); } setShowKeyDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              API-avain luotu
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">Tärkeää:</strong> Kopioi tämä avain nyt. Sitä ei näytetä enää uudelleen.
              Avaimesta tallennetaan tietokantaan vain salattu tiiviste (hash).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all select-all border">
              {generatedKey}
            </div>
            <Button onClick={handleCopy} variant="outline" className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Kopioitu!" : "Kopioi leikepöydälle"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowKeyDialog(false); setGeneratedKey(""); }}>
              Olen kopioinut avaimen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poista API-avain?</AlertDialogTitle>
            <AlertDialogDescription>
              Tämä poistaa avaimen pysyvästi. Kaikki tätä avainta käyttävät integraatiot lakkaavat toimimasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && deleteMutation.mutate(deleteKeyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Poista avain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
