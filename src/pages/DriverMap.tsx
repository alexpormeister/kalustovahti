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
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Filter, Car } from "lucide-react";
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

// Create custom cluster icon
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = "small";
  let dimension = 40;
  if (count >= 10) { size = "medium"; dimension = 50; }
  if (count >= 50) { size = "large"; dimension = 60; }

  return L.divIcon({
    html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
    className: "custom-cluster-marker",
    iconSize: L.point(dimension, dimension),
  });
};

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

  // Create individual markers for each vehicle
  const vehicleMarkers = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesAttributes = selectedAttributes.length === 0 ||
        selectedAttributes.every((attrId) =>
          v.attributes?.some((a) => a.id === attrId)
        );
      return matchesStatus && matchesAttributes;
    });

    const markers: { vehicle: Vehicle; position: [number, number]; city: string }[] = [];

    filtered.forEach((v) => {
      const city = v.driver?.city;
      if (city && cityCoords[city]) {
        // Add slight random offset so markers don't stack exactly
        const offset = () => (Math.random() - 0.5) * 0.02;
        markers.push({
          vehicle: v,
          position: [cityCoords[city][0] + offset(), cityCoords[city][1] + offset()],
          city,
        });
        return;
      }
      // Fallback: use company driver's city
      if (!v.driver?.city) {
        const companyDrivers = drivers.filter((d) => d.company_id === v.company_id && d.city);
        if (companyDrivers.length > 0) {
          const fallbackCity = companyDrivers[0].city!;
          if (cityCoords[fallbackCity]) {
            const offset = () => (Math.random() - 0.5) * 0.02;
            markers.push({
              vehicle: v,
              position: [cityCoords[fallbackCity][0] + offset(), cityCoords[fallbackCity][1] + offset()],
              city: fallbackCity,
            });
          }
        }
      }
    });

    return markers;
  }, [vehicles, drivers, statusFilter, selectedAttributes]);

  const totalShown = vehicleMarkers.length;

  return (
    <DashboardLayout>
      <style>{`
        .custom-cluster-marker { background: transparent !important; border: none !important; }
        .cluster-icon {
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; font-weight: 700; color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .cluster-icon span { font-size: 14px; }
        .cluster-small { background: hsl(var(--primary)); width: 40px; height: 40px; }
        .cluster-medium { background: hsl(var(--primary)); width: 50px; height: 50px; opacity: 0.9; }
        .cluster-medium span { font-size: 16px; }
        .cluster-large { background: hsl(var(--destructive)); width: 60px; height: 60px; }
        .cluster-large span { font-size: 18px; }
      `}</style>
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
                <MarkerClusterGroup
                  chunkedLoading
                  iconCreateFunction={createClusterCustomIcon}
                  maxClusterRadius={50}
                  spiderfyOnMaxZoom
                  showCoverageOnHover={false}
                >
                  {vehicleMarkers.map((m, i) => (
                    <Marker key={`${m.vehicle.id}-${i}`} position={m.position}>
                      <Popup>
                        <div className="space-y-1 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            <strong>{m.vehicle.vehicle_number}</strong>
                          </div>
                          <div className="text-xs">
                            <p>{m.vehicle.registration_number} — {m.vehicle.brand} {m.vehicle.model}</p>
                            {m.vehicle.company?.name && <p className="text-gray-500">{m.vehicle.company.name}</p>}
                            {m.vehicle.driver?.full_name && <p>Kuljettaja: {m.vehicle.driver.full_name}</p>}
                            <p className="text-gray-400">{m.city}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-1 text-xs h-7"
                            onClick={() => navigate(`/kalusto/${m.vehicle.id}`)}
                          >
                            Avaa profiili
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
