"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { PhotoAvatar, InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUnreadMessageCount } from "@/hooks/use-unread-messages";

/**
 * User profile block shown at the bottom of the sidebar (avatar, name, role)
 * plus the notifications bell.
 */
export function SidebarUser({ compact = false }: { compact?: boolean }) {
  const { data: user } = useCurrentUser();
  const unread = useUnreadMessageCount("advisor");
  const name = user?.name ?? "Asesora";
  const role = user?.role ?? "Asesora Comercial";

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span title={name}>
          {user?.avatarUrl ? (
            <PhotoAvatar src={user.avatarUrl} alt={name} className="size-9" />
          ) : (
            <InitialsAvatar initials={getInitials(name)} className="size-9 text-[12px]" />
          )}
        </span>
        <Link
          href="/dashboard/notificaciones"
          aria-label="Notificaciones"
          title="Notificaciones"
          className="relative grid size-9 place-items-center rounded-[14px] text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Bell className="size-[18px]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
      </div>
    );
  }

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
        {unread > 0 ? (
          <span className="absolute right-1 top-1 grid size-[15px] min-w-[15px] place-items-center rounded-full border-2 border-canvas bg-brand px-0.5 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
