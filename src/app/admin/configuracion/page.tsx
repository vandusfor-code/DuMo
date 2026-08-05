"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsSections } from "@/components/admin/settings/settings-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useSettings,
  useTestGoogleSheets,
  useUpdateCompany,
  useUpdateGoogleSheets,
  useUpdateWhatsApp,
} from "@/hooks/use-admin-settings";

export default function AdminConfiguracionPage() {
  const { data, isLoading, isError, refetch } = useSettings();
  const updateCompany = useUpdateCompany();
  const updateWhatsApp = useUpdateWhatsApp();
  const updateGoogleSheets = useUpdateGoogleSheets();
  const testSheets = useTestGoogleSheets();

  return (
    <div>
      <AdminPageHeader
        title="Configuración"
        subtitle="Configuración general del sistema — empresa e integraciones"
      />

      {isError ? (
        <ErrorState title="No se pudo cargar la configuración" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-card" />
          ))}
        </div>
      ) : (
        <SettingsSections
          data={data}
          onSaveCompany={(v) => updateCompany.mutate(v)}
          onSaveWhatsApp={(v) => updateWhatsApp.mutate(v)}
          onSaveGoogleSheets={(v) => updateGoogleSheets.mutate(v)}
          onTestGoogleSheets={() => testSheets.mutate()}
        />
      )}
    </div>
  );
}
