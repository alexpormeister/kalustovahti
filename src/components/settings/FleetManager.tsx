import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

export function FleetManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: fleets = [], isLoading } = useQuery({
    queryKey: ["fleets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fleets")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fleets")
        .insert({ name: newName, description: newDesc || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleets"] });
      toast.success("Fleetti luotu");
      setNewName("");
      setNewDesc("");
    },
    onError: () => toast.error("Virhe luotaessa fleettiä"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fleets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleets"] });
      toast.success("Fleetti poistettu");
    },
    onError: () => toast.error("Virhe poistettaessa"),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Fleetit
        </CardTitle>
        <CardDescription>Hallitse autojen fleettiryhmittelyä</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Fleetin nimi"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Kuvaus (valinnainen)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <Button
            size="icon"
            onClick={() => newName && createMutation.mutate()}
            disabled={!newName || createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Ladataan...</p>
        ) : fleets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ei fleettejä</p>
        ) : (
          <div className="space-y-2">
            {fleets.map((fleet: any) => (
              <div key={fleet.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{fleet.name}</p>
                  {fleet.description && <p className="text-xs text-muted-foreground">{fleet.description}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Haluatko varmasti poistaa tämän fleetin?")) {
                      deleteMutation.mutate(fleet.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
