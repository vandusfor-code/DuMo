"use client";

import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DuoSaleStatusBadge } from "@/components/admin/ventas-por-cerrar/duo-sale-status-badge";
import { getInitials } from "@/lib/format";
import type { DuoSale } from "@/types/duo-sale";

export function AdvisorDuoTable({
  data,
  onOpen,
}: {
  data: DuoSale[];
  onOpen: (sale: DuoSale) => void;
}) {
  if (data.length === 0) {
    return (
      <Card className="grid place-items-center p-10 text-center">
        <p className="text-[14px] text-muted">No tienes casos de Operación Duo asignados.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Cliente</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Concretó</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="pr-6 text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sale) => (
            <TableRow key={sale.id} className="cursor-pointer" onClick={() => onOpen(sale)}>
              <TableCell className="pl-6">
                <div className="flex items-center gap-3">
                  <InitialsAvatar initials={getInitials(sale.customerName)} className="size-9 text-[12px]" />
                  <div className="leading-tight">
                    <p className="font-medium text-ink">{sale.customerName}</p>
                    <p className="text-[12px] text-muted">{sale.phone}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-ink">{sale.plan || "—"}</TableCell>
              <TableCell className="text-muted">{sale.originAdvisorName}</TableCell>
              <TableCell>
                <DuoSaleStatusBadge sale={sale} />
              </TableCell>
              <TableCell className="pr-6 text-right">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(sale);
                  }}
                >
                  <MessageSquare className="size-4" />
                  Abrir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
