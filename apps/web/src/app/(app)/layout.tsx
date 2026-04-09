import { AppShell } from "@/components/layout/app-shell";
import { CriticalAlertWatcher } from "@/components/alerts/critical-alert-watcher";
import PWARegister from "@/components/pwa-register";
import { PWAInstallProvider } from "@/components/pwa-install-provider";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <CriticalAlertWatcher />
      <PWAInstallProvider>
        <PWARegister />
        {children}
      </PWAInstallProvider>
    </AppShell>
  );
}