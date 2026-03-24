"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="grid grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-0 flex-col items-center justify-center px-1 py-2 transition-colors",
                isActive
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={[
                  "mt-1 max-w-full truncate text-[10px] font-medium leading-none transition-all",
                  isActive ? "block" : "hidden",
                ].join(" ")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}