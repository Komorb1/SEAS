import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export async function Topbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Smart Emergency Alert System
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor sites, devices, and emergency events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/profile"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {user ? `@${user.username}` : "User"}
          </Link>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}