import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
}

export function ProfileSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) {
          setProfileData({
            first_name: (profile as any).first_name || "",
            last_name: (profile as any).last_name || "",
            phone: profile.phone || "",
          });
        }
      }
      setIsLoading(false);
    };
    loadProfile();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ei kirjautunut sisään");
      const fullName = `${data.first_name} ${data.last_name}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profiili päivitetty onnistuneesti");
      setIsEditing(false);
    },
    onError: () => toast.error("Virhe profiilin päivityksessä"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salasana vaihdettu onnistuneesti");
      setIsPasswordDialogOpen(false);
      setPasswords({ new: "", confirm: "" });
    },
    onError: (error: any) => toast.error("Virhe: " + error.message),
  });

  if (isLoading) {
    return <Card className="glass-card"><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Profiili</CardTitle>
              <CardDescription>Hallitse profiilitietojasi</CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Muokkaa</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="profile-first-name">Etunimi</Label>
                <Input id="profile-first-name" value={profileData.first_name} onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })} placeholder="Matti" />
              </div>
              <div>
                <Label htmlFor="profile-last-name">Sukunimi</Label>
                <Input id="profile-last-name" value={profileData.last_name} onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })} placeholder="Meikäläinen" />
              </div>
            </div>
            <div>
              <Label htmlFor="profile-phone">Puhelinnumero</Label>
              <Input id="profile-phone" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value.replace(/[^\d+\s-]/g, '') })} placeholder="+358 40 123 4567" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateProfileMutation.mutate(profileData)} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Tallenna
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Peruuta</Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Etunimi</p>
              <p className="font-medium">{profileData.first_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sukunimi</p>
              <p className="font-medium">{profileData.last_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Puhelinnumero</p>
              <p className="font-medium">{profileData.phone || "—"}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                Vaihda salasana
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Vaihda salasana</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-password">Uusi salasana</Label>
                  <Input id="new-password" type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} placeholder="Vähintään 6 merkkiä" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Vahvista salasana</Label>
                  <Input id="confirm-password" type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Kirjoita sama salasana uudelleen" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Peruuta</Button>
                  <Button onClick={() => {
                    if (passwords.new !== passwords.confirm) { toast.error("Salasanat eivät täsmää"); return; }
                    if (passwords.new.length < 6) { toast.error("Vähintään 6 merkkiä"); return; }
                    changePasswordMutation.mutate({ newPassword: passwords.new });
                  }} disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? "Vaihdetaan..." : "Vaihda salasana"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
