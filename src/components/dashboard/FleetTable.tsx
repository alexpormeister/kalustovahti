import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  company: string;
  driver?: string;
  status: "active" | "maintenance" | "removed";
  attributes?: string[];
}

interface FleetTableProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export function FleetTable({
  vehicles,
  onView,
  onEdit,
  onDelete,
}: FleetTableProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">
              Rekisterinumero
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Autonumero
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Merkki / Malli
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Yritys
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Kuljettaja
            </TableHead>
            <TableHead className="font-semibold text-foreground">
              Tila
            </TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Ei ajoneuvoja löytynyt
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle) => (
              <TableRow
                key={vehicle.id}
                className="border-border hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">
                  {vehicle.registrationNumber}
                </TableCell>
                <TableCell>{vehicle.vehicleNumber}</TableCell>
                <TableCell>
                  {vehicle.brand} {vehicle.model}
                </TableCell>
                <TableCell>{vehicle.company}</TableCell>
                <TableCell>{vehicle.driver || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={vehicle.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(vehicle)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Näytä
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(vehicle)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Muokkaa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(vehicle)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Poista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
