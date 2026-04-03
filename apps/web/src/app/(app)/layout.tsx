import { AppShell } from "@/components/layout/app-shell";
import { CriticalAlertWatcher } from "@/components/alerts/critical-alert-watcher";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <CriticalAlertWatcher />
      {children}
    </AppShell>
  );
}