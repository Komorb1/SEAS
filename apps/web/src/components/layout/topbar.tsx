import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export async function Topbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Smart Emergency Alert System</h1>
          <p className="text-sm text-slate-400">
            Monitor sites, devices, and emergency events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white">
            <div>
              {user ? `@${user.username}` : "User"}
            </div>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}