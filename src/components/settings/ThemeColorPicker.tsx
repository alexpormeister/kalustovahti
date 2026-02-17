import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PRIMARY = "#FFDC29";

function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeColorPicker() {
  const [color, setColor] = useState(DEFAULT_PRIMARY);

  useEffect(() => {
    const saved = localStorage.getItem("theme-primary-color");
    if (saved) {
      setColor(saved);
      applyColor(saved);
    }
  }, []);

  const applyColor = (hex: string) => {
    const hsl = hexToHSL(hex);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--accent", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
    document.documentElement.style.setProperty("--sidebar-primary", hsl);
    document.documentElement.style.setProperty("--sidebar-ring", hsl);
    document.documentElement.style.setProperty("--chart-1", hsl);
  };

  const handleSave = () => {
    localStorage.setItem("theme-primary-color", color);
    applyColor(color);
    toast.success("Teemaväri päivitetty");
  };

  const handleReset = () => {
    localStorage.removeItem("theme-primary-color");
    setColor(DEFAULT_PRIMARY);
    applyColor(DEFAULT_PRIMARY);
    toast.success("Teemaväri palautettu oletukseen");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Palette className="h-5 w-5 text-primary" />
        <div>
          <h4 className="font-medium">Teemaväri</h4>
          <p className="text-sm text-muted-foreground">Muuta sovelluksen pääväriä</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="theme-color">Väri</Label>
          <input
            id="theme-color"
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); applyColor(e.target.value); }}
            className="w-10 h-10 rounded cursor-pointer border border-border"
          />
        </div>
        <Input
          value={color}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              setColor(v);
              if (v.length === 7) applyColor(v);
            }
          }}
          className="w-28 font-mono text-sm"
          placeholder="#FFDC29"
        />
        <div className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: color }} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />Tallenna
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />Palauta oletus
        </Button>
      </div>
    </div>
  );
}
