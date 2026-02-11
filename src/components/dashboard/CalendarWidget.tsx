import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu",
  "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu",
];
const DAY_NAMES = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

export function CalendarWidget() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based offset
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Kalenteri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              className={cn(
                "text-xs py-1.5 rounded-md transition-colors",
                day === null && "invisible",
                day !== null && "hover:bg-muted/50 cursor-default",
                day !== null && isToday(day) && "bg-primary text-primary-foreground font-bold",
              )}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Tänään: {today.getDate()}. {MONTH_NAMES[today.getMonth()].toLowerCase()}ta {today.getFullYear()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
