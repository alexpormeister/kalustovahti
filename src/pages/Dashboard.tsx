import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { FleetTable, Vehicle } from "@/components/dashboard/FleetTable";
import { Button } from "@/components/ui/button";
import { Car, Users, Building2, AlertTriangle, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
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

  // Fetch vehicles with company and driver info
  const { data: vehiclesData = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          company:companies(name),
          driver:profiles!vehicles_assigned_driver_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !loading,
  });

  // Fetch stats
  const { data: companiesCount = 0 } = useQuery({
    queryKey: ["companies-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !loading,
  });

  const { data: driversCount = 0 } = useQuery({
    queryKey: ["drivers-count"],
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

  // Transform data to Vehicle format
  const vehicles: Vehicle[] = vehiclesData.map((v: any) => ({
    id: v.id,
    registrationNumber: v.registration_number,
    vehicleNumber: v.vehicle_number,
    brand: v.brand,
    model: v.model,
    company: v.company?.name || "—",
    driver: v.driver?.full_name || undefined,
    status: v.status as "active" | "maintenance" | "removed",
  }));

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = searchQuery.toLowerCase();
    return (
      vehicle.registrationNumber.toLowerCase().includes(query) ||
      vehicle.vehicleNumber.toLowerCase().includes(query) ||
      vehicle.driver?.toLowerCase().includes(query) ||
      vehicle.brand.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query)
    );
  });

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;

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
            <h1 className="text-3xl font-bold text-foreground">Hallintapaneeli</h1>
            <p className="text-muted-foreground mt-1">
              Tervetuloa takaisin! Tässä on yhteenveto kalustostasi.
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/autot")}>
            <Plus className="h-4 w-4" />
            Lisää ajoneuvo
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ajoneuvoja yhteensä"
            value={vehicles.length}
            icon={<Car className="h-6 w-6 text-primary" />}
            description="Kaikki rekisteröidyt"
          />
          <StatCard
            title="Aktiiviset"
            value={activeCount}
            icon={<Car className="h-6 w-6 text-status-active" />}
          />
          <StatCard
            title="Huollossa"
            value={maintenanceCount}
            icon={<AlertTriangle className="h-6 w-6 text-status-maintenance" />}
          />
          <StatCard
            title="Yrityksiä"
            value={companiesCount}
            icon={<Building2 className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Search and Table */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Suodata
              </Button>
              <Button variant="outline" size="sm">
                Vie tiedot
              </Button>
            </div>
          </div>

          {vehiclesLoading ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="animate-pulse text-muted-foreground">Ladataan ajoneuvoja...</div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Ei ajoneuvoja</h3>
              <p className="text-muted-foreground mb-4">
                Aloita lisäämällä ensimmäinen ajoneuvo kalustoon.
              </p>
              <Button onClick={() => navigate("/autot")}>
                <Plus className="h-4 w-4 mr-2" />
                Lisää ajoneuvo
              </Button>
            </div>
          ) : (
            <FleetTable
              vehicles={filteredVehicles}
              onView={(vehicle) => console.log("View:", vehicle)}
              onEdit={(vehicle) => console.log("Edit:", vehicle)}
              onDelete={(vehicle) => console.log("Delete:", vehicle)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
