"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Router,
  ShieldAlert,
  User,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Sites",
    href: "/sites",
    icon: MapPinned,
  },
  {
    label: "Devices",
    href: "/devices",
    icon: Router,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: ShieldAlert,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
  {
  label: "Audit Logs",
  href: "/audit-logs",
  icon: ClipboardList,
},
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:min-h-screen md:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-600/15 p-2">
            <Bell className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              SEAS
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Emergency Control Panel
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}