"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminCommissionDetail } from "@/hooks/use-admin-commissions";
import type { AdminCommissionFilters } from "@/types/admin-commission";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function AdminCommissionDetailView({
  advisorId,
  month,
  year,
}: {
  advisorId: string;
  month: string;
  year: string;
}) {
  const filters: AdminCommissionFilters = { month, year, advisor: advisorId, status: "all" };
  const { data, isLoading, isError, refetch } = useAdminCommissionDetail(advisorId, filters);

  return (
    <div>
      <Link
        href="/admin/comisiones"
        className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-brand hover:text-brand-hover"
      >
        <ArrowLeft className="size-4" />
        Volver a comisiones
      </Link>

      {isError ? (
        <ErrorState title="No se pudo cargar el detalle" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-96 rounded-card" />
      ) : (
        <div className="space-y-5">
          <AdminPageHeader
            title={data.advisor.name}
            subtitle={`Comisión total: ${money.format(data.totalCommission)} · Calculado: ${new Date(data.calculatedAt).toLocaleDateString("es-CL")}`}
          />

          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">Ventas finalizadas</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Líneas</TableHead>
                  <TableHead>Comisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sales.map((s) => (
                  <TableRow key={s.saleId}>
                    <TableCell className="font-semibold">{s.saleId}</TableCell>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.plan}</TableCell>
                    <TableCell>{s.lines}</TableCell>
                    <TableCell className="font-semibold">{money.format(s.commission)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {data.paymentHistory.length > 0 && (
            <Card className="p-5">
              <h3 className="text-[15px] font-semibold text-ink">Historial de pagos</h3>
              <ul className="mt-4 space-y-2">
                {data.paymentHistory.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-xl border border-line px-4 py-3 text-[14px]">
                    <span>{p.note} · {p.date}</span>
                    <span className="font-semibold">{money.format(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
