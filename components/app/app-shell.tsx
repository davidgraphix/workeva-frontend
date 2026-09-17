"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";

import { useSession } from "@/components/session-provider";
import { useUnreadCount } from "@/hooks/use-workeva";
import { Avatar } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";
import {
  mobileNavigation,
  primaryNavigation,
  secondaryNavigation,
  visibleItems,
  type NavItem,
} from "./navigation";

/**
 * The application frame.
 *
 * Desktop gets a persistent navy sidebar; a phone gets a compact top bar, a
 * slide-over drawer for the full menu, and a bottom bar holding the four things
 * somebody actually reaches for on a phone - with attendance among them, because
 * clocking in must never be more than one tap away.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, can, signOut } = useSession();
  const pathname = usePathname();
  // The drawer remembers the page it was opened on, so navigating closes it - otherwise
  // it would stay open over the new page.
  const [drawerOpenOn, setDrawerOpenOn] = useState<string | null>(null);
  const drawerOpen = drawerOpenOn === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerOpenOn(open ? pathname : null);

  const hasEmployeeRecord = Boolean(me?.active?.employeeId);
  const primary = visibleItems(primaryNavigation, can, hasEmployeeRecord);
  const secondary = visibleItems(secondaryNavigation, can, hasEmployeeRecord);
  const mobile = visibleItems(mobileNavigation, can, hasEmployeeRecord);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sidebar (lg and up) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-navy-950 lg:flex">
        <BrandMark organizationName={me?.active?.organizationName} logoUrl={me?.active?.logoUrl} />
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
          <NavList items={primary} pathname={pathname} />
          {secondary.length > 0 && (
            <>
              <hr className="my-3 border-navy-800" />
              <NavList items={secondary} pathname={pathname} />
            </>
          )}
        </nav>
        <SidebarFooter
          name={me?.active?.employeeFullName ?? me?.fullName ?? me?.email ?? ""}
          roleName={me?.active?.roleName}
          avatarUrl={me?.avatarUrl}
          onSignOut={signOut}
        />
      </aside>

      {/* Drawer (below lg) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-950">
            <div className="flex items-center justify-between">
              <BrandMark organizationName={me?.active?.organizationName} logoUrl={me?.active?.logoUrl} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="mr-3 rounded p-1.5 text-navy-600 hover:bg-navy-900 hover:text-white"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
              <NavList items={primary} pathname={pathname} />
              {secondary.length > 0 && (
                <>
                  <hr className="my-3 border-navy-800" />
                  <NavList items={secondary} pathname={pathname} />
                </>
              )}
            </nav>
            <SidebarFooter
              name={me?.active?.employeeFullName ?? me?.fullName ?? me?.email ?? ""}
              roleName={me?.active?.roleName}
              avatarUrl={me?.avatarUrl}
              onSignOut={signOut}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />

        {/* Bottom padding clears the mobile bottom bar. */}
        <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileBottomBar items={mobile} pathname={pathname} />
    </div>
  );
}

function BrandMark({ organizationName, logoUrl }: { organizationName?: string; logoUrl?: string | null }) {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-7 rounded object-cover" />
      ) : (
        <span aria-hidden className="grid size-7 place-items-center rounded bg-brand-600 text-xs font-bold text-white">
          W
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{organizationName ?? "Workeva"}</p>
      </div>
    </div>
  );
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-navy-800 text-white" : "text-slate-300 hover:bg-navy-900 hover:text-white",
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarFooter({
  name,
  roleName,
  avatarUrl,
  onSignOut,
}: {
  name: string;
  roleName?: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="border-t border-navy-800 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} src={avatarUrl} size="sm" className="ring-navy-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          {roleName && <p className="truncate text-xs text-slate-400">{roleName}</p>}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-navy-900 hover:text-white"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { me, switchOrganization } = useSession();
  const unread = useUnreadCount();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  const memberships = me?.memberships ?? [];
  const count = unread.data?.count ?? 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-1 rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>

        {/* The organization switcher only appears when there is a choice to make. */}
        {memberships.length > 1 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOrgMenuOpen((open) => !open)}
              aria-expanded={orgMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <span className="max-w-[10rem] truncate">{me?.active?.organizationName}</span>
              <ChevronDown aria-hidden className="size-4 text-slate-400" />
            </button>

            {orgMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              >
                {memberships.map((membership) => (
                  <button
                    key={membership.organizationId}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      switchOrganization(membership.organizationId);
                      setOrgMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-slate-50",
                      membership.organizationId === me?.active?.organizationId && "bg-brand-50",
                    )}
                  >
                    <span className="text-sm font-medium text-slate-900">{membership.organizationName}</span>
                    <span className="text-xs text-slate-500">{membership.roleName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="truncate text-sm font-semibold text-slate-900 lg:hidden">
            {me?.active?.organizationName ?? "Workeva"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
          >
            <Bell aria-hidden className="size-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileBottomBar({ items, pathname }: { items: NavItem[]; pathname: string }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-brand-700" : "text-slate-500",
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
