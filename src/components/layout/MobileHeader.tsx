import { Menu, Car } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="text-sidebar-foreground"
      >
        <Menu className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
          <Car className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-primary">
            Kalustovahti
          </span>
          <span className="text-xs text-sidebar-foreground/60">
            Kumppanihallinta
          </span>
        </div>
      </div>
    </header>
  );
}
