"use client";

import { useState } from "react";
import { KeyRound, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AUTH_ROLE_LABELS, type AuthRole } from "@/types/auth";
import type { PublicUser } from "@/hooks/use-admin-users";
import type { CreateUserInput, UpdateUserInput } from "@/types/auth";

type DialogMode = "create" | "edit" | "password" | null;

export function AdminUsersTable({
  users,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onChangePassword,
}: {
  users: PublicUser[];
  onCreate: (data: CreateUserInput) => void;
  onUpdate: (id: string, data: UpdateUserInput) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onChangePassword: (id: string, password: string) => void;
}) {
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<PublicUser | null>(null);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[15px] font-semibold text-ink">Usuarios del sistema</h3>
          <Button size="sm" onClick={() => { setSelected(null); setDialog("create"); }}>
            <Plus className="size-4" />
            Crear usuario
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-[14px] text-muted">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onToggle(u.id, !u.active)}
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        u.active ? "bg-success-soft text-success-ink" : "bg-canvas text-muted",
                      )}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                          <MoreVertical className="size-4 text-muted" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(u); setDialog("edit"); }}>
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(u); setDialog("password"); }}>
                          <KeyRound className="size-4" /> Cambiar contraseña
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(u.id)} className="text-danger-ink">
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <UserDialog
        open={dialog === "create"}
        title="Crear usuario"
        initial={null}
        onClose={() => setDialog(null)}
        onSave={(values) => { onCreate(values as CreateUserInput); setDialog(null); }}
        requirePassword
      />

      <UserDialog
        open={dialog === "edit" && !!selected}
        title="Editar usuario"
        initial={selected}
        onClose={() => setDialog(null)}
        onSave={(values) => {
          if (selected) {
            onUpdate(selected.id, values as UpdateUserInput);
            setDialog(null);
          }
        }}
      />

      <PasswordDialog
        open={dialog === "password" && !!selected}
        userName={selected?.name ?? ""}
        onClose={() => setDialog(null)}
        onSave={(password) => {
          if (selected) {
            onChangePassword(selected.id, password);
            setDialog(null);
          }
        }}
      />
    </>
  );
}

function UserDialog({
  open,
  title,
  initial,
  onClose,
  onSave,
  requirePassword,
}: {
  open: boolean;
  title: string;
  initial: PublicUser | null;
  onClose: () => void;
  onSave: (values: CreateUserInput | UpdateUserInput) => void;
  requirePassword?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<AuthRole>(initial?.roleKey ?? "asesora");
  const [active, setActive] = useState(initial?.active ?? true);
  const [password, setPassword] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-6">
        <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
        <div className="mt-4 space-y-3">
          <input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <select value={role} onChange={(e) => setRole(e.target.value as AuthRole)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]">
            {(Object.entries(AUTH_ROLE_LABELS) as [AuthRole, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {!requirePassword && (
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Usuario activo
            </label>
          )}
          {requirePassword && (
            <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (requirePassword) {
                onSave({ name, username, email, role, password, active: true });
              } else {
                onSave({ name, username, email, role, active });
              }
            }}
          >
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PasswordDialog({
  open,
  userName,
  onClose,
  onSave,
}: {
  open: boolean;
  userName: string;
  onClose: () => void;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-[17px] font-semibold text-ink">Cambiar contraseña</h3>
        <p className="mt-1 text-[14px] text-muted">{userName}</p>
        <div className="mt-4 space-y-3">
          <input placeholder="Nueva contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input placeholder="Confirmar contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!password || password !== confirm || password.length < 6}
            onClick={() => onSave(password)}
          >
            Guardar contraseña
          </Button>
        </div>
      </Card>
    </div>
  );
}
