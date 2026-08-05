"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useAdminChangePassword,
  useAdminUsers,
  useCreateUser,
  useDeleteUser,
  useToggleUser,
  useUpdateUser,
} from "@/hooks/use-admin-users";

export default function AdminUsuariosPage() {
  const { data, isLoading, isError, refetch } = useAdminUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toggleUser = useToggleUser();
  const deleteUser = useDeleteUser();
  const changePassword = useAdminChangePassword();

  return (
    <div>
      <AdminPageHeader
        title="Usuarios"
        subtitle="Administración de usuarios, roles y accesos al sistema"
      />

      {isError ? (
        <ErrorState title="No se pudieron cargar los usuarios" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <Skeleton className="h-96 rounded-card" />
      ) : (
        <AdminUsersTable
          users={data}
          onCreate={(input) => createUser.mutate(input)}
          onUpdate={(id, input) => updateUser.mutate({ id, data: input })}
          onToggle={(id, active) => toggleUser.mutate({ id, active })}
          onDelete={(id) => deleteUser.mutate(id)}
          onChangePassword={(id, newPassword) => changePassword.mutate({ id, newPassword })}
        />
      )}
    </div>
  );
}
