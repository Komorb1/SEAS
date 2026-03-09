"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BellRing } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { loginUser } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      await loginUser({
        identifier: identifier.trim(),
        password,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-3">
          <div className="rounded-xl bg-red-600/15 p-2">
            <BellRing className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">SEAS</p>
            <p className="text-xs text-slate-400">
              Smart Emergency Alert System
            </p>
          </div>
        </Link>

        <AuthCard
          title="Sign in"
          description="Access your SEAS dashboard to monitor sites, devices, and emergency events."
          footer={
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-red-400 hover:text-red-300"
              >
                Register
              </Link>
            </p>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <AuthInput
              label="Username or Email"
              type="text"
              name="identifier"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
            />

            <AuthInput
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />

            {errorMessage ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </AuthCard>
      </div>
    </main>
  );
}