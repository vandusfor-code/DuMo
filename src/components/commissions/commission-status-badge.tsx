import { Badge } from "@/components/ui/badge";
import type { CommissionStatus } from "@/types/commission";

/** Pagada (verde) / Pendiente (naranja). */
export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return status === "paid" ? (
    <Badge tone="success">Pagada</Badge>
  ) : (
    <Badge tone="warning">Pendiente</Badge>
  );
}
