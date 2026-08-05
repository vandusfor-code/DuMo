"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, SIGN_OUT_ITEM, type NavItem } from "@/lib/nav";
import { useUnreadMessageCount } from "@/hooks/use-unread-messages";
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[14px] font-medium transition-all duration-200 ease-[var(--ease-out-soft)]",
        active
          ? "bg-brand text-white shadow-[0_8px_20px_rgba(109,40,217,0.28)]"
          : "text-muted hover:bg-brand-soft hover:text-brand",
      )}
    >
      <Icon
        className={cn(
          "size-[19px] shrink-0 transition-colors",
          active ? "text-white" : "text-muted group-hover:text-brand",
        )}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && (
        <span
          className={cn(
            "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
            active ? "bg-white/25 text-white" : "bg-brand text-white",
          )}
        >
          {item.badge}
        </span>
      )}
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-card lg:flex">
      <div className="flex h-[88px] items-center px-6">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
        {navWithBadges(PRIMARY_NAV).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        <div className="my-3 h-px bg-line" />

        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <SidebarUser />
        <NavLink item={SIGN_OUT_ITEM} active={false} />
      </div>
    </aside>
  );
}
