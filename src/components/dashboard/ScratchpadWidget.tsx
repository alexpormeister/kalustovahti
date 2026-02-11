import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Check } from "lucide-react";

export function ScratchpadWidget() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: note } = useQuery({
    queryKey: ["user-notes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (note) setContent(note.content);
  }, [note]);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_notes")
        .upsert({ user_id: user.id, content: text, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Debounced auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (content !== (note?.content ?? "")) {
        saveMutation.mutate(content);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content]);

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          Muistiinpanot
          {saved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-normal animate-fade-in">
              <Check className="h-3 w-3 text-status-active" />
              Tallennettu
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Kirjoita vapaita muistiinpanoja tähän... Tallennetaan automaattisesti."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[280px] resize-none text-sm border-dashed"
        />
      </CardContent>
    </Card>
  );
}
