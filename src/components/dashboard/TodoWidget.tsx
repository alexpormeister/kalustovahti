import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListTodo, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TodoWidget() {
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState("");

  const { data: todos = [] } = useQuery({
    queryKey: ["user-todos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_todos").insert({ user_id: user.id, title });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-todos"] });
      setNewTask("");
    },
    onError: () => toast.error("Virhe lisättäessä tehtävää"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("user_todos")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-todos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-todos"] }),
  });

  const pending = todos.filter((t: any) => !t.completed);
  const done = todos.filter((t: any) => t.completed);

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          Tehtävät
          {pending.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {pending.length} avointa
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTask.trim()) addMutation.mutate(newTask.trim());
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Lisää uusi tehtävä..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="text-sm"
          />
          <Button type="submit" size="icon" variant="default" disabled={!newTask.trim() || addMutation.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {pending.map((todo: any) => (
            <div key={todo.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={false}
                onCheckedChange={() => toggleMutation.mutate({ id: todo.id, completed: true })}
              />
              <span className="text-sm flex-1">{todo.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(todo.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {done.length > 0 && (
            <div className="pt-2 border-t mt-2">
              <p className="text-xs text-muted-foreground mb-1">Valmiit ({done.length})</p>
              {done.slice(0, 5).map((todo: any) => (
                <div key={todo.id} className="flex items-center gap-2 group py-1 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleMutation.mutate({ id: todo.id, completed: false })}
                  />
                  <span className="text-sm flex-1 line-through text-muted-foreground">{todo.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {todos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ei tehtäviä — lisää ensimmäinen!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
