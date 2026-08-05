import { Badge } from "@/components/ui/badge";
import {
  ADMIN_SALE_STATUS_LABELS,
  type AdminSaleStatus,
} from "@/types/admin-sale";

const TONE: Record<AdminSaleStatus, "brand" | "warning" | "success" | "danger" | "neutral"> = {
  registrada: "brand",
  en_reparto: "warning",
  finalizada: "success",
  rechazada: "danger",
  cancelada: "neutral",
};

export function AdminSaleStatusBadge({ status }: { status: AdminSaleStatus }) {
  return <Badge tone={TONE[status]}>{ADMIN_SALE_STATUS_LABELS[status]}</Badge>;
}

/** Colores de la leyenda del pie de tabla. */
export const STATUS_LEGEND: { status: AdminSaleStatus; dot: string }[] = [
  { status: "registrada", dot: "bg-brand" },
  { status: "en_reparto", dot: "bg-warning" },
  { status: "finalizada", dot: "bg-success" },
  { status: "rechazada", dot: "bg-danger" },
  { status: "cancelada", dot: "bg-[#9ca3af]" },
];
