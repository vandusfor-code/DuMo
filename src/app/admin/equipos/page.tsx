"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  EquipmentCatalogTable,
  EquipmentDialog,
} from "@/components/admin/equipment/equipment-panels";
import { EquipmentMetrics } from "@/components/admin/equipment/equipment-metrics";
import { EquipmentImportDialog } from "@/components/admin/equipment/equipment-import-dialog";
import { CarrierToggle } from "@/components/admin/shared/carrier-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useCreateEquipment,
  useDeleteAllEquipment,
  useDeleteEquipment,
  useEquipmentCatalog,
  useSetEquipmentStatus,
  useUpdateEquipment,
} from "@/hooks/use-admin-equipment";
import type { EquipmentCatalogItem } from "@/types/equipment";

export default function AdminEquiposPage() {
  const [carrierFilter, setCarrierFilter] = useState("wom");
  const { data, isLoading, isError, refetch } = useEquipmentCatalog(carrierFilter);
  const create = useCreateEquipment();
  const update = useUpdateEquipment();
  const setStatus = useSetEquipmentStatus();
  const remove = useDeleteEquipment();
  const removeAll = useDeleteAllEquipment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentCatalogItem | null>(null);

  const items = data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="Equipos"
          subtitle="Catálogo maestro de equipos para Gestión y el futuro Asistente de Venta"
        />
        <CarrierToggle value={carrierFilter} onChange={setCarrierFilter} />
      </div>

      {isError && !data ? (
        <ErrorState
          title="No se pudo cargar el catálogo"
          message="Ocurrió un problema al consultar los equipos. Verifica tu conexión e intenta nuevamente."
          onRetry={() => refetch()}
        />
      ) : isLoading && !data ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <>
          <EquipmentMetrics items={items} />
          <EquipmentCatalogTable
            items={items}
            onCreate={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            onImport={() => setImportOpen(true)}
            onEdit={(item) => {
              setEditing(item);
              setDialogOpen(true);
            }}
            onToggleStatus={(id, status) => setStatus.mutate({ id, status })}
            onDelete={(id) => remove.mutate(id)}
            onDeleteAll={async () => {
              await removeAll.mutateAsync();
            }}
            deletingAll={removeAll.isPending}
          />
        </>
      )}

      <EquipmentImportDialog
        open={importOpen}
        defaultCarrier={carrierFilter}
        onClose={() => setImportOpen(false)}
      />

      <EquipmentDialog
        open={dialogOpen}
        initial={editing}
        defaultCarrier={carrierFilter}
        onClose={() => setDialogOpen(false)}
        onSave={(values) => {
          if (editing) {
            update.mutate({ id: editing.id, equipment: values });
          } else {
            create.mutate(values);
          }
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
