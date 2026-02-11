import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = 50 + 38 * Math.cos(angle);
    const y = 50 + 38 * Math.sin(angle);
    return { x, y, label: i === 0 ? "12" : String(i) };
  });

  const minuteMarkers = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const outerR = 44;
    const innerR = i % 5 === 0 ? 40 : 42;
    return {
      x1: 50 + innerR * Math.cos(angle),
      y1: 50 + innerR * Math.sin(angle),
      x2: 50 + outerR * Math.cos(angle),
      y2: 50 + outerR * Math.sin(angle),
      major: i % 5 === 0,
    };
  });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Kello
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer ring */}
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="45" fill="hsl(var(--card))" />

            {/* Minute markers */}
            {minuteMarkers.map((m, i) => (
              <line
                key={i}
                x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
                stroke={m.major ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                strokeWidth={m.major ? "1" : "0.4"}
              />
            ))}

            {/* Hour numbers */}
            {hourMarkers.map((m) => (
              <text
                key={m.label}
                x={m.x} y={m.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(var(--foreground))"
                fontSize="5"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >
                {m.label}
              </text>
            ))}

            {/* Hour hand */}
            <line
              x1="50" y1="50"
              x2="50" y2="26"
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${hourDeg}, 50, 50)`}
            />

            {/* Minute hand */}
            <line
              x1="50" y1="50"
              x2="50" y2="18"
              stroke="hsl(var(--foreground))"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${minuteDeg}, 50, 50)`}
            />

            {/* Second hand */}
            <line
              x1="50" y1="55"
              x2="50" y2="16"
              stroke="hsl(var(--primary))"
              strokeWidth="0.7"
              strokeLinecap="round"
              transform={`rotate(${secondDeg}, 50, 50)`}
            />

            {/* Center dot */}
            <circle cx="50" cy="50" r="2" fill="hsl(var(--primary))" />
            <circle cx="50" cy="50" r="1" fill="hsl(var(--foreground))" />
          </svg>
        </div>
        <p className="text-lg font-mono font-semibold text-foreground mt-2">
          {time.toLocaleTimeString("fi-FI")}
        </p>
        <p className="text-sm text-muted-foreground">
          {time.toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </CardContent>
    </Card>
  );
}
