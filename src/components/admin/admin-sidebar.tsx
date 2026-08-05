"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, ADMIN_SIGN_OUT, type AdminNavItem } from "@/lib/admin-nav";
import { Logo } from "@/components/layout/logo";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active }: { item: AdminNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14px] font-medium transition-all duration-200 ease-[var(--ease-out-soft)]",
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
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const SignOutIcon = ADMIN_SIGN_OUT.icon;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-card lg:flex">
      <div className="flex h-[88px] items-center px-6">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="border-t border-line p-4">
        <Link
          href={ADMIN_SIGN_OUT.href}
          className="group flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14px] font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <SignOutIcon className="size-[19px] text-muted group-hover:text-brand" />
          {ADMIN_SIGN_OUT.label}
        </Link>
      </div>
    </aside>
  );
}
