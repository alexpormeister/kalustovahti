import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Partners from "./pages/Partners";
import CompanyProfile from "./pages/CompanyProfile";
import DocumentChecklist from "./pages/DocumentChecklist";
import Fleet from "./pages/Fleet";
import Hardware from "./pages/Hardware";
import Drivers from "./pages/Drivers";
import DriverProfile from "./pages/DriverProfile";
import VehicleProfile from "./pages/VehicleProfile";


import Settings from "./pages/Settings";
import Maintenance from "./pages/Maintenance";
import UserManagement from "./pages/UserManagement";
import QualityControl from "./pages/QualityControl";
import RoleManagement from "./pages/RoleManagement";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const saved = localStorage.getItem("theme-primary-color");
    if (saved) {
      const hexToHSL = (hex: string) => {
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
      };
      const hsl = hexToHSL(saved);
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--accent", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
      document.documentElement.style.setProperty("--sidebar-primary", hsl);
      document.documentElement.style.setProperty("--sidebar-ring", hsl);
      document.documentElement.style.setProperty("--chart-1", hsl);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/autoilijat" element={<Partners />} />
          <Route path="/autoilijat/:id" element={<CompanyProfile />} />
          <Route path="/dokumentit" element={<DocumentChecklist />} />
          <Route path="/kalusto" element={<Fleet />} />
          <Route path="/kalusto/:id" element={<VehicleProfile />} />
          <Route path="/laitteet" element={<Hardware />} />
          <Route path="/kuljettajat" element={<Drivers />} />
          <Route path="/kuljettajat/:id" element={<DriverProfile />} />
          
          
          <Route path="/laadunvalvonta" element={<QualityControl />} />
          <Route path="/asetukset" element={<Settings />} />
          <Route path="/yllapito" element={<Maintenance />} />
          <Route path="/kayttajat" element={<UserManagement />} />
          <Route path="/roolit" element={<RoleManagement />} />
          <Route path="/raportit" element={<Reports />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
