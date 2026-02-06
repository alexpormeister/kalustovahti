import { cn } from "@/lib/utils";

type Status = "active" | "maintenance" | "removed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusLabels: Record<Status, string> = {
  active: "Aktiivinen",
  maintenance: "Huollossa",
  removed: "Poistettu",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "status-badge",
        {
          "status-active": status === "active",
          "status-maintenance": status === "maintenance",
          "status-removed": status === "removed",
        },
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
