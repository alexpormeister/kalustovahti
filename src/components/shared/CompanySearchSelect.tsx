import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  business_id: string | null;
}

interface CompanySearchSelectProps {
  value: string; // company_id
  onChange: (companyId: string) => void;
  placeholder?: string;
}

export function CompanySearchSelect({
  value,
  onChange,
  placeholder = "Hae yrityksen nimellä tai Y-tunnuksella...",
}: CompanySearchSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-search-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, business_id")
        .order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  const selectedCompany = companies.find((c) => c.id === value);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.business_id?.toLowerCase().includes(q)
    );
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (companyId: string) => {
    onChange(companyId);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={isOpen ? search : selectedCompany ? `${selectedCompany.name}${selectedCompany.business_id ? ` (${selectedCompany.business_id})` : ""}` : ""}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Ei tuloksia
            </div>
          ) : (
            filtered.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                  company.id === value && "bg-accent text-accent-foreground"
                )}
              >
                <span className="font-medium">{company.name}</span>
                {company.business_id && (
                  <span className="ml-2 text-muted-foreground">
                    ({company.business_id})
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
