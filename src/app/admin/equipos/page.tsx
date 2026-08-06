"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  EquipmentCatalogTable,
  EquipmentDialog,
} from "@/components/admin/equipment/equipment-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useCreateEquipment,
  useDeleteEquipment,
  useEquipmentCatalog,
  useSetEquipmentStatus,
  useUpdateEquipment,
} from "@/hooks/use-admin-equipment";
import type { EquipmentCatalogItem } from "@/types/equipment";

export default function AdminEquiposPage() {
  const { data, isLoading, isError, refetch } = useEquipmentCatalog();
  const create = useCreateEquipment();
  const update = useUpdateEquipment();
  const setStatus = useSetEquipmentStatus();
  const remove = useDeleteEquipment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentCatalogItem | null>(null);

  return (
    <div>
      <AdminPageHeader
        title="Equipos"
        subtitle="Catálogo maestro de equipos para Gestión y el futuro Asistente de Venta"
      />

      {isError && !data ? (
        <ErrorState title="No se pudo cargar el catálogo" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <EquipmentCatalogTable
          items={data}
          onCreate={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          onEdit={(item) => {
            setEditing(item);
            setDialogOpen(true);
          }}
          onToggleStatus={(id, status) => setStatus.mutate({ id, status })}
          onDelete={(id) => remove.mutate(id)}
        />
      )}

      <EquipmentDialog
        open={dialogOpen}
        initial={editing}
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
