"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-600/20 p-2">
            <Bell className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">SEAS</p>
            <p className="text-xs text-slate-400">Emergency Control Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-red-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}