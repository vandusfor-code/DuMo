"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryStaleBanner, shouldShowFatalQueryError } from "@/components/shared/query-state";
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
  const query = useAdminUsers();
  const { data, isLoading, isError, refetch } = query;
  const fatal = shouldShowFatalQueryError(query);
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

      {fatal ? (
        <ErrorState title="No se pudieron cargar los usuarios" onRetry={() => refetch()} />
      ) : (
        <>
          <QueryStaleBanner visible={isError && !!data} onRetry={() => refetch()} />
          {isLoading && !data ? (
        <Skeleton className="h-96 rounded-card" />
          ) : data ? (
        <AdminUsersTable
          users={data}
          onCreate={async (input) => { await createUser.mutateAsync(input); }}
          onUpdate={async (id, input) => { await updateUser.mutateAsync({ id, data: input }); }}
          onToggle={(id, active) => toggleUser.mutate({ id, active })}
          onDelete={(id) => deleteUser.mutate(id)}
          onChangePassword={async (id, newPassword) => { await changePassword.mutateAsync({ id, newPassword }); }}
        />
          ) : null}
        </>
      )}
    </div>
  );
}
