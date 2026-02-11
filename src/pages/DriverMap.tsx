import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Filter, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

// Fix leaflet default marker
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const cityCoords: Record<string, [number, number]> = {
  Helsinki: [60.1699, 24.9384],
  Espoo: [60.2055, 24.6559],
  Vantaa: [60.2934, 25.0378],
  Tampere: [61.4978, 23.761],
  Turku: [60.4518, 22.2666],
  Oulu: [65.0121, 25.4651],
  Rovaniemi: [66.5039, 25.7294],
  Lahti: [60.9827, 25.6612],
  Jyväskylä: [62.2426, 25.7473],
  Kuopio: [62.8924, 27.6782],
  Joensuu: [62.6010, 29.7636],
  Pori: [61.4851, 21.7974],
  Hämeenlinna: [60.9929, 24.4605],
  Vaasa: [63.0960, 21.6158],
  Seinäjoki: [62.7903, 22.8403],
  Kokkola: [63.8384, 23.1305],
  Kajaani: [64.2270, 27.7281],
  Mikkeli: [61.6886, 27.2722],
  Kouvola: [60.8681, 26.7043],
  Lappeenranta: [61.0587, 28.1887],
};

interface Vehicle {
  id: string;
  vehicle_number: string;
  registration_number: string;
  brand: string;
  model: string;
  status: string;
  company_id: string | null;
  company?: { name: string } | null;
  driver?: { full_name: string; city: string | null; province: string | null } | null;
  attributes?: { id: string; name: string }[];
}

export default function DriverMap() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["map-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          company:companies(name),
          driver:drivers!vehicles_assigned_driver_id_fkey(full_name, city, province)
        `)
        .order("vehicle_number");
      if (error) throw error;

      const vehicleIds = data.map((v: any) => v.id);
      const { data: attributeLinks } = await supabase
        .from("vehicle_attribute_links")
        .select("vehicle_id, attribute:vehicle_attributes(id, name)")
        .in("vehicle_id", vehicleIds);

      return data.map((v: any) => ({
        ...v,
        attributes: attributeLinks
          ?.filter((link: any) => link.vehicle_id === v.id)
          .map((link: any) => link.attribute) || [],
      })) as Vehicle[];
    },
  });

  // Fetch all drivers with city info for vehicles without assigned drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ["map-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, city, province, company_id")
        .not("city", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: attributes = [] } = useQuery({
    queryKey: ["vehicle-attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_attributes")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Group vehicles by city
  const vehiclesByCity = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesAttributes = selectedAttributes.length === 0 ||
        selectedAttributes.every((attrId) =>
          v.attributes?.some((a) => a.id === attrId)
        );
      return matchesStatus && matchesAttributes;
    });

    const grouped: Record<string, Vehicle[]> = {};
    filtered.forEach((v) => {
      const city = v.driver?.city;
      if (city && cityCoords[city]) {
        if (!grouped[city]) grouped[city] = [];
        grouped[city].push(v);
      }
    });

    // Also group by company location from drivers table
    filtered.forEach((v) => {
      if (v.driver?.city) return; // already handled
      const companyDrivers = drivers.filter((d) => d.company_id === v.company_id && d.city);
      if (companyDrivers.length > 0) {
        const city = companyDrivers[0].city!;
        if (cityCoords[city]) {
          if (!grouped[city]) grouped[city] = [];
          if (!grouped[city].find((gv) => gv.id === v.id)) {
            grouped[city].push(v);
          }
        }
      }
    });

    return grouped;
  }, [vehicles, drivers, statusFilter, selectedAttributes]);

  const totalShown = Object.values(vehiclesByCity).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Karttanäkymä</h1>
            <p className="text-muted-foreground mt-1">
              Autojen sijainnit kaupungeittain ({totalShown} autoa)
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki</SelectItem>
                <SelectItem value="active">Aktiiviset</SelectItem>
                <SelectItem value="removed">Poistetut</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilters && attributes.length > 0 && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Suodata varustelulla</h4>
              <div className="flex flex-wrap gap-3">
                {attributes.map((attr) => (
                  <div key={attr.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`map-attr-${attr.id}`}
                      checked={selectedAttributes.includes(attr.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAttributes((prev) =>
                          checked ? [...prev, attr.id] : prev.filter((id) => id !== attr.id)
                        );
                      }}
                    />
                    <label htmlFor={`map-attr-${attr.id}`} className="text-sm cursor-pointer">
                      {attr.name}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: "600px" }}>
              <MapContainer
                center={[63.0, 25.5]}
                zoom={5}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {Object.entries(vehiclesByCity).map(([city, cityVehicles]) => {
                  const coords = cityCoords[city];
                  if (!coords) return null;
                  return (
                    <Marker key={city} position={coords}>
                      <Popup maxWidth={300}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <strong>{city}</strong>
                            <Badge variant="secondary">{cityVehicles.length} autoa</Badge>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {cityVehicles.map((v) => (
                              <div key={v.id} className="text-xs border-t pt-1">
                                <span className="font-medium">{v.vehicle_number}</span> — {v.registration_number}
                                <br />
                                {v.brand} {v.model}
                                {v.company?.name && <span className="text-gray-500"> ({v.company.name})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
