"use client";

import { ProfilePanel } from "@/components/admin/perfil/profile-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useChangeOwnPassword, useProfile, useUpdateProfile } from "@/hooks/use-admin-users";

export default function DashboardPerfilPage() {
  const { data, isLoading, isError, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangeOwnPassword();

  return (
    <div className="space-y-6 pt-1">
      <PageHeader
        title="Perfil"
        subtitle="Gestiona tu información personal y contraseña."
      />

      {isError ? (
        <ErrorState title="No se pudo cargar tu perfil" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-80 rounded-card" />
      ) : (
        <ProfilePanel
          user={data}
          isSaving={updateProfile.isPending}
          onSaveProfile={(values) => updateProfile.mutate(values)}
          onChangePassword={(values) => changePassword.mutate(values)}
        />
      )}
    </div>
  );
}
