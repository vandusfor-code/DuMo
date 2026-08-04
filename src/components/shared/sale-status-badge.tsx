import { Badge } from "@/components/ui/badge";
import type { SaleStatus } from "@/types/common";

const CONFIG: Record<
  SaleStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  completed: { label: "Completada", tone: "success" },
  pending: { label: "Pendiente", tone: "warning" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

/** Maps a domain sale status to its DuMo badge. Reused across all screens. */
export function SaleStatusBadge({
  status,
  size = "sm",
}: {
  status: SaleStatus;
  size?: "sm" | "md";
}) {
  const { label, tone } = CONFIG[status];
  return (
    <Badge tone={tone} size={size}>
      {label}
    </Badge>
  );
}
