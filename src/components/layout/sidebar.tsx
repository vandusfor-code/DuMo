"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, SIGN_OUT_ITEM, type NavItem } from "@/lib/nav";
import { useUnreadMessageCount } from "@/hooks/use-unread-messages";
import { APP_SIDEBAR_WIDTH_CLASS } from "@/components/layout/app-shell.constants";
import { Logo } from "./logo";
import { SidebarUser } from "./sidebar-user";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      title={item.label}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "group relative mx-auto flex size-11 items-center justify-center rounded-[14px] transition-all duration-200 ease-[var(--ease-out-soft)]",
        active
          ? "bg-brand text-white shadow-[0_8px_20px_rgba(109,40,217,0.28)]"
          : "text-muted hover:bg-brand-soft hover:text-brand",
      )}
    >
      <Icon
        className={cn(
          "size-[20px] shrink-0 transition-colors",
          active ? "text-white" : "text-muted group-hover:text-brand",
        )}
      />
      {item.badge != null ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const unread = useUnreadMessageCount("advisor");

  const navWithBadges = (items: NavItem[]) =>
    items.map((item) => {
      if (item.href === "/dashboard/leads" && unread > 0) {
        return { ...item, badge: unread > 99 ? 99 : unread };
      }
      if (item.href === "/dashboard/notificaciones" && unread > 0) {
        return { ...item, badge: unread > 99 ? 99 : unread };
      }
      return item;
    });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-30 hidden flex-col border-l border-line bg-card lg:flex",
        APP_SIDEBAR_WIDTH_CLASS,
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-line/60">
        <Logo compact />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-4">
        {navWithBadges(PRIMARY_NAV).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        <div className="my-2 h-px w-8 bg-line" />

        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="flex flex-col items-center gap-2 border-t border-line p-2 pb-4">
        <SidebarUser compact />
        <NavLink item={SIGN_OUT_ITEM} active={false} />
      </div>
    </aside>
  );
}
