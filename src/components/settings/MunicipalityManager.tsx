import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

const FINNISH_PROVINCES = [
  "Uusimaa", "Varsinais-Suomi", "Satakunta", "Kanta-Häme", "Pirkanmaa",
  "Päijät-Häme", "Kymenlaakso", "Etelä-Karjala", "Etelä-Savo", "Pohjois-Savo",
  "Pohjois-Karjala", "Keski-Suomi", "Etelä-Pohjanmaa", "Pohjanmaa",
  "Keski-Pohjanmaa", "Pohjois-Pohjanmaa", "Kainuu", "Lappi", "Ahvenanmaa",
];

export function MunicipalityManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newProvince, setNewProvince] = useState("");

  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipalities")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("municipalities")
        .insert({ name: newName.trim(), province: newProvince || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipalities"] });
      toast.success("Kunta lisätty");
      setNewName("");
      setNewProvince("");
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "Kunta on jo olemassa" : "Virhe lisättäessä"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("municipalities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["municipalities"] });
      toast.success("Kunta poistettu");
    },
    onError: () => toast.error("Virhe poistettaessa"),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Kunnat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Kunnan nimi"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="w-40">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newProvince}
              onChange={(e) => setNewProvince(e.target.value)}
            >
              <option value="">Maakunta</option>
              {FINNISH_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <Button
            size="icon"
            onClick={() => { if (newName.trim()) createMutation.mutate(); }}
            disabled={!newName.trim() || createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {municipalities.map((m: any) => (
            <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
              {m.name} {m.province && <span className="text-muted-foreground text-xs">({m.province})</span>}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-destructive/20"
                onClick={() => deleteMutation.mutate(m.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {municipalities.length === 0 && (
            <p className="text-sm text-muted-foreground">Ei kuntia</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
