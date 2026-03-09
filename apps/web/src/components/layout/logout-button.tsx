"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logoutUser();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
    >
      Logout
    </button>
  );
}