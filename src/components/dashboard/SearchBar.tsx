import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Hae rekisterinumerolla, autonumerolla tai kuljettajan nimellä...",
}: SearchBarProps) {
  return (
    <div className="relative max-w-2xl">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 pl-10 text-base bg-card border-border focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
