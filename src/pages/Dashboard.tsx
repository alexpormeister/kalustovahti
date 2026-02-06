import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  Users,
  Building2,
  Smartphone,
  FileCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch stats
  const { data: vehiclesData = [] } = useQuery({
    queryKey: ["dashboard-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, status");
      if (error) throw error;
      return data || [];
    },
    enabled: !loading,
  });

  const { data: companiesData = [] } = useQuery({
    queryKey: ["dashboard-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, contract_status")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !loading,
  });

  const { data: driversCount = 0 } = useQuery({
    queryKey: ["dashboard-drivers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("driver_number", "is", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !loading,
  });

  const { data: hardwareCount = 0 } = useQuery({
    queryKey: ["dashboard-hardware-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hardware_devices")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !loading,
  });

  const activeVehicles = vehiclesData.filter((v) => v.status === "active").length;
  const maintenanceVehicles = vehiclesData.filter((v) => v.status === "maintenance").length;
  const activeContracts = companiesData.filter((c) => c.contract_status === "active").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Ladataan...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Hallintapaneeli
            </h1>
            <p className="text-muted-foreground mt-1">
              Tervetuloa Lähitaksi-kumppaninhallintaan
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Aktiiviset sopimukset"
            value={activeContracts}
            icon={<FileCheck className="h-6 w-6 text-primary" />}
            description={`${companiesData.length} yritystä yhteensä`}
          />
          <StatCard
            title="Ajoneuvoja"
            value={vehiclesData.length}
            icon={<Car className="h-6 w-6 text-primary" />}
            description={`${activeVehicles} aktiivista`}
          />
          <StatCard
            title="Kuljettajia"
            value={driversCount}
            icon={<Users className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Laitteita"
            value={hardwareCount}
            icon={<Smartphone className="h-6 w-6 text-primary" />}
            description="Maksupäätteet, SIM-kortit"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active Companies */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Viimeisimmät kumppanit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companiesData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ei yrityksiä</p>
              ) : (
                <div className="space-y-2">
                  {companiesData.slice(0, 5).map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm font-medium">{company.name}</span>
                      <Badge
                        variant={
                          company.contract_status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          company.contract_status === "active"
                            ? "bg-status-active text-status-active-foreground"
                            : ""
                        }
                      >
                        {company.contract_status === "active"
                          ? "Aktiivinen"
                          : company.contract_status === "pending"
                          ? "Odottaa"
                          : company.contract_status || "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate("/autoilijat")}
              >
                Näytä kaikki
              </Button>
            </CardContent>
          </Card>

          {/* Vehicle Status */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Kaluston tila
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aktiiviset</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-active rounded-full"
                        style={{
                          width: `${
                            vehiclesData.length > 0
                              ? (activeVehicles / vehiclesData.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {activeVehicles}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Huollossa</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-maintenance rounded-full"
                        style={{
                          width: `${
                            vehiclesData.length > 0
                              ? (maintenanceVehicles / vehiclesData.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {maintenanceVehicles}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate("/kalusto")}
              >
                Kalustolista
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Pikatoiminnot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/autoilijat")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Lisää autoilija
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/kalusto")}
              >
                <Car className="h-4 w-4 mr-2" />
                Lisää ajoneuvo
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/laitteet")}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Lisää laite
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/varustelu")}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Hallitse varustelua
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
