"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProfilePanel } from "@/components/admin/perfil/profile-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useChangeOwnPassword, useProfile, useUpdateProfile } from "@/hooks/use-admin-users";

export default function AdminPerfilPage() {
  const { data, isLoading, isError, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangeOwnPassword();

  return (
    <div>
      <AdminPageHeader title="Perfil" subtitle="Tu información personal y seguridad de la cuenta" />

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
