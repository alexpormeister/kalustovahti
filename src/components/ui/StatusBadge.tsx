import { cn } from "@/lib/utils";

type Status = "active" | "removed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusLabels: Record<Status, string> = {
  active: "Aktiivinen",
  removed: "Poistettu",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "status-badge",
        {
          "status-active": status === "active",
          "status-removed": status === "removed",
        },
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
