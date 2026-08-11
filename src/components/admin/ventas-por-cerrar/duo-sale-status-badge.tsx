import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DuoSale } from "@/types/duo-sale";

/**
 * Estado visual de una fila de "Ventas por cerrar". A diferencia de
 * DUO_SALE_STATUS_LABELS (3 estados en la BD), aquí se distingue
 * "Sin contactar" cuando ya está asignada pero la asesora de cierre dejó
 * una nota de intento fallido — el status en BD sigue siendo "assigned".
 */
export function DuoSaleStatusBadge({ sale }: { sale: DuoSale }) {
  if (sale.status === "pending_assignment") {
    return <Badge tone="warning">Sin asignar</Badge>;
  }
  if (sale.status === "assigned" && sale.closingNotes.length > 0) {
    return <Badge tone="danger">Sin contactar</Badge>;
  }
  if (sale.status === "assigned") {
    return (
      <Badge tone="success">
        <MessageCircle className="size-3" />
        Asignada
      </Badge>
    );
  }
  return <Badge tone="brand">Cerrada</Badge>;
}
