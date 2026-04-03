"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logoutUser();
      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      Logout
    </button>
  );
}