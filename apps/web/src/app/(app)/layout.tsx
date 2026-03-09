import { AppShell } from "@/components/layout/app-shell";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}