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

import Equipment from "./pages/Equipment";
import Settings from "./pages/Settings";
import Maintenance from "./pages/Maintenance";
import UserManagement from "./pages/UserManagement";
import QualityControl from "./pages/QualityControl";
import RoleManagement from "./pages/RoleManagement";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
          
          <Route path="/varustelu" element={<Equipment />} />
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

export default App;
