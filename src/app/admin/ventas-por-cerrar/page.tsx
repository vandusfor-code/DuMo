"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VentasPorCerrarKpis } from "@/components/admin/ventas-por-cerrar/ventas-por-cerrar-kpis";
import { VentasPorCerrarTable } from "@/components/admin/ventas-por-cerrar/ventas-por-cerrar-table";
import { computeVentasPorCerrarKpis } from "@/data/mock/ventas-por-cerrar.mock";
import { useAdminAdvisors } from "@/hooks/use-admin-leads";
import { useAdminVentasPorCerrar, useAssignDuoSale } from "@/hooks/use-ventas-por-cerrar";
import type { DuoSaleStatus } from "@/types/duo-sale";

const PAGE_SIZE = 6;

type StatusFilter = "all" | DuoSaleStatus;

/**
 * DUO-3 — vista admin de "Ventas por cerrar" conectada a duo_sales real.
 * "Asignar asesora" escribe en la base (useAssignDuoSale) — ya no es local.
 */
export default function VentasPorCerrarPage() {
  const { data: rows, isLoading, isError, refetch } = useAdminVentasPorCerrar();
  const { data: advisors = [] } = useAdminAdvisors();
  const assignMutation = useAssignDuoSale();

  const [search, setSearch] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        r.customerName.toLowerCase().includes(term) ||
        r.phone.toLowerCase().includes(term);
      const matchesAdvisor = advisorFilter === "all" || r.originAdvisorId === advisorFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "assigned"
            ? r.status === "assigned" && r.closingNotes.length === 0
            : r.status === statusFilter;
      return matchesSearch && matchesAdvisor && matchesStatus;
    });
  }, [rows, search, advisorFilter, statusFilter]);

  const kpis = useMemo(() => computeVentasPorCerrarKpis(rows ?? []), [rows]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setAdvisorFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Ventas por cerrar"
        subtitle="Gestiona las ventas concretadas por chat que necesitan cierre por llamada — Operación Duo."
      />

      {isError && !rows ? (
        <ErrorState
          title="No se pudieron cargar las ventas por cerrar"
          onRetry={() => refetch()}
        />
      ) : isLoading && !rows ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-[480px] rounded-card" />
        </div>
      ) : (
        <div className="space-y-5">
          <VentasPorCerrarKpis
            pendingAssignment={kpis.pendingAssignment}
            assigned={kpis.assigned}
            noContact={kpis.noContact}
            closedToday={0}
          />

          <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar cliente o teléfono..."
                className="h-11 w-full rounded-input border border-line bg-card pl-10 pr-4 text-[14px] text-ink outline-none placeholder:text-muted focus-visible:border-brand"
              />
            </div>

            <Select
              value={advisorFilter}
              onValueChange={(v) => {
                setAdvisorFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full text-[14px] lg:w-[200px]">
                <SelectValue placeholder="Asesora origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Asesora origen — Todas</SelectItem>
                {advisors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full text-[14px] lg:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estado — Todos</SelectItem>
                <SelectItem value="pending_assignment">Sin asignar</SelectItem>
                <SelectItem value="assigned">Asignada</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="secondary" onClick={clearFilters} className="shrink-0">
              <Filter className="size-4" />
              Limpiar filtros
            </Button>
          </Card>

          <VentasPorCerrarTable
            data={paged}
            total={filtered.length}
            page={page}
            pageSize={PAGE_SIZE}
            advisorOptions={advisors}
            onPageChange={setPage}
            onAssign={(saleId, advisor) => {
              assignMutation.mutate({
                id: saleId,
                advisorId: advisor.id,
                advisorName: advisor.name,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
