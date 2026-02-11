import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Thermometer } from "lucide-react";

const LOCATIONS: Record<string, { lat: number; lon: number; label: string }> = {
  helsinki: { lat: 60.17, lon: 24.94, label: "Helsinki" },
  espoo: { lat: 60.21, lon: 24.66, label: "Espoo" },
  tampere: { lat: 61.50, lon: 23.79, label: "Tampere" },
  turku: { lat: 60.45, lon: 22.27, label: "Turku" },
  oulu: { lat: 65.01, lon: 25.47, label: "Oulu" },
  rovaniemi: { lat: 66.50, lon: 25.72, label: "Rovaniemi" },
  jyvaskyla: { lat: 62.24, lon: 25.75, label: "Jyväskylä" },
  kuopio: { lat: 62.89, lon: 27.68, label: "Kuopio" },
};

const getWeatherIcon = (code: number) => {
  if (code <= 1) return <Sun className="h-10 w-10 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-10 w-10 text-muted-foreground" />;
  if (code <= 49) return <Cloud className="h-10 w-10 text-muted-foreground" />;
  if (code <= 67) return <CloudRain className="h-10 w-10 text-blue-400" />;
  if (code <= 77) return <CloudSnow className="h-10 w-10 text-blue-200" />;
  if (code <= 82) return <CloudRain className="h-10 w-10 text-blue-500" />;
  if (code <= 86) return <CloudSnow className="h-10 w-10 text-blue-300" />;
  return <CloudLightning className="h-10 w-10 text-yellow-400" />;
};

const getWeatherLabel = (code: number) => {
  if (code <= 0) return "Selkeä";
  if (code <= 1) return "Pääosin selkeä";
  if (code <= 2) return "Puolipilvinen";
  if (code <= 3) return "Pilvinen";
  if (code <= 49) return "Sumua";
  if (code <= 55) return "Tihkusadetta";
  if (code <= 57) return "Jäätävää tihkua";
  if (code <= 65) return "Sadetta";
  if (code <= 67) return "Jäätävää sadetta";
  if (code <= 75) return "Lumisadetta";
  if (code <= 77) return "Lumijyväsiä";
  if (code <= 82) return "Sadekuuroja";
  if (code <= 86) return "Lumikuuroja";
  return "Ukkosta";
};

export function WeatherWidget() {
  const [location, setLocation] = useState("helsinki");
  const loc = LOCATIONS[location];

  const { data: weather, isLoading } = useQuery({
    queryKey: ["weather", location],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Helsinki&forecast_days=4`
      );
      if (!res.ok) throw new Error("Weather fetch failed");
      return res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 min cache
    refetchInterval: 30 * 60 * 1000,
  });

  const current = weather?.current;
  const daily = weather?.daily;
  const days = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            Sää
          </CardTitle>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOCATIONS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Ladataan säätietoja...</div>
        ) : current ? (
          <div className="space-y-4">
            {/* Current weather */}
            <div className="flex items-center gap-4">
              {getWeatherIcon(current.weather_code)}
              <div>
                <p className="text-3xl font-bold">{Math.round(current.temperature_2m)}°C</p>
                <p className="text-sm text-muted-foreground">{getWeatherLabel(current.weather_code)}</p>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{Math.round(current.wind_speed_10m)} km/h</span>
              <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" />{current.relative_humidity_2m}%</span>
            </div>

            {/* Forecast */}
            {daily && (
              <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                {daily.time.slice(0, 4).map((date: string, i: number) => {
                  const d = new Date(date);
                  return (
                    <div key={date} className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {i === 0 ? "Tänään" : days[d.getDay()]}
                      </p>
                      <div className="flex justify-center scale-50 -my-2">
                        {getWeatherIcon(daily.weather_code[i])}
                      </div>
                      <p className="text-xs">
                        <span className="font-medium">{Math.round(daily.temperature_2m_max[i])}°</span>
                        <span className="text-muted-foreground"> / {Math.round(daily.temperature_2m_min[i])}°</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Säätietoja ei saatavilla</p>
        )}
      </CardContent>
    </Card>
  );
}
