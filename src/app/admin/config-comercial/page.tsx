"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  CommercialPlanDialog,
  CommercialPlansTable,
  CommercialSettingsForm,
} from "@/components/admin/commercial-config/commercial-config-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useCommercialConfig,
  useCreateCommercialPlan,
  useDeleteCommercialPlan,
  useDuplicateCommercialPlan,
  useUpdateCommercialPlan,
  useUpdateCommercialSettings,
} from "@/hooks/use-admin-commercial-config";
import type { CommercialPlan } from "@/types/commercial-config";

export default function AdminConfigComercialPage() {
  const { data, isLoading, isError, refetch } = useCommercialConfig();
  const updateSettings = useUpdateCommercialSettings();
  const createPlan = useCreateCommercialPlan();
  const updatePlan = useUpdateCommercialPlan();
  const duplicatePlan = useDuplicateCommercialPlan();
  const deletePlan = useDeleteCommercialPlan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialPlan | null>(null);
  const [carrierFilter, setCarrierFilter] = useState("wom");

  return (
    <div>
      <AdminPageHeader
        title="Configuración comercial"
        subtitle="Planes, comisiones y metas que alimentan todos los cálculos del sistema"
      />

      {isError && !data ? (
        <ErrorState title="No se pudo cargar la configuración" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : (
        <div className="space-y-5">
          <CommercialPlansTable
            plans={data.plans.filter((p) => p.operator === carrierFilter)}
            carrierFilter={carrierFilter}
            onCarrierFilterChange={setCarrierFilter}
            onCreate={() => { setEditing(null); setDialogOpen(true); }}
            onEdit={(p) => { setEditing(p); setDialogOpen(true); }}
            onDuplicate={(id) => duplicatePlan.mutate(id)}
            onDelete={(id) => deletePlan.mutate(id)}
          />
          <CommercialSettingsForm
            settings={data.settings}
            isSaving={updateSettings.isPending}
            onSave={(s) => updateSettings.mutate(s)}
          />
        </div>
      )}

      <CommercialPlanDialog
        open={dialogOpen}
        initial={editing}
        defaultCarrier={carrierFilter}
        onClose={() => setDialogOpen(false)}
        onSave={(values) => {
          if (editing) {
            updatePlan.mutate({ id: editing.id, plan: values });
          } else {
            createPlan.mutate(values);
          }
        }}
      />
    </div>
  );
}
