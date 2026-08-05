"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InitialsAvatar, PhotoAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import type { PublicUser } from "@/hooks/use-admin-users";

export function ProfilePanel({
  user,
  onSaveProfile,
  onChangePassword,
  isSaving,
}: {
  user: PublicUser;
  onSaveProfile: (data: { name: string; email: string; username: string }) => void;
  onChangePassword: (data: { currentPassword: string; newPassword: string }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <PhotoAvatar src={user.avatarUrl} alt={user.name} className="size-16" />
          ) : (
            <InitialsAvatar initials={getInitials(user.name)} className="size-16 text-[18px]" />
          )}
          <div>
            <h3 className="text-[18px] font-semibold text-ink">{user.name}</h3>
            <p className="text-[14px] text-muted">{user.role}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[13px] text-muted">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Usuario</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button disabled={isSaving} onClick={() => onSaveProfile({ name, email, username })}>
            Guardar perfil
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-[16px] font-semibold text-ink">Cambiar contraseña</h3>
        <div className="mt-4 space-y-3">
          <input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
        </div>
        {passwordMsg && <p className="mt-3 text-[13px] text-danger-ink">{passwordMsg}</p>}
        <div className="mt-5 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              if (newPassword.length < 6) {
                setPasswordMsg("La contraseña debe tener al menos 6 caracteres.");
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordMsg("Las contraseñas no coinciden.");
                return;
              }
              setPasswordMsg(null);
              onChangePassword({ currentPassword, newPassword });
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
          >
            Actualizar contraseña
          </Button>
        </div>
      </Card>
    </div>
  );
}
