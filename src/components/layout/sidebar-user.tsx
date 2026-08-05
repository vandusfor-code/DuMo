"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { PhotoAvatar, InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * User profile block shown at the bottom of the sidebar (avatar, name, role)
 * plus the notifications bell.
 */
export function SidebarUser() {
  const { data: user } = useCurrentUser();
  const name = user?.name ?? "Asesora";
  const role = user?.role ?? "Asesora Comercial";

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-canvas/60 px-2.5 py-2">
      {user?.avatarUrl ? (
        <PhotoAvatar src={user.avatarUrl} alt={name} className="size-9" />
      ) : (
        <InitialsAvatar initials={getInitials(name)} className="size-9 text-[12px]" />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
        <p className="truncate text-[11px] text-muted">{role}</p>
      </div>
      <Link
        href="/dashboard/notificaciones"
        aria-label="Notificaciones"
        className="relative grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Bell className="size-[18px]" />
        <span className="absolute right-1 top-1 grid size-[15px] place-items-center rounded-full border-2 border-canvas bg-brand text-[9px] font-semibold text-white">
          3
        </span>
      </Link>
    </div>
  );
}
