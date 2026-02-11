import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TodoWidget } from "@/components/dashboard/TodoWidget";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { AnalogClock } from "@/components/dashboard/AnalogClock";

export default function Dashboard() {
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

        <div className="grid gap-6 lg:grid-cols-1">
          <WeatherWidget />
        </div>
      </div>
    </DashboardLayout>
  );
}
