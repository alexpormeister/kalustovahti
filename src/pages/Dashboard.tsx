import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TodoWidget } from "@/components/dashboard/TodoWidget";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { AnalogClock } from "@/components/dashboard/AnalogClock";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Ladataan...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hallintapaneeli</h1>
          <p className="text-muted-foreground mt-1">Tervetuloa Kalustovahdin kumppaninhallintaan</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TodoWidget />
          <AnalogClock />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WeatherWidget />
          <CalendarWidget />
        </div>
      </div>
    </DashboardLayout>
  );
}
