"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type ClientInfo = {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
};

type PWAInstallContextValue = ClientInfo & {
  isHydrated: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  clearPrompt: () => void;
};

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

const DEFAULT_CLIENT_INFO: ClientInfo = {
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
};

function getClientInfo(): ClientInfo {
  const ua = window.navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return { isIOS, isAndroid, isStandalone };
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const isHydrated = useHydrated();
  const [clientInfo, setClientInfo] = useState<ClientInfo>(DEFAULT_CLIENT_INFO);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const clearPrompt = useCallback(() => {
    setDeferredPrompt(null);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const updateClientInfo = () => {
      const next = getClientInfo();

      setClientInfo((prev) =>
        prev.isIOS === next.isIOS &&
        prev.isAndroid === next.isAndroid &&
        prev.isStandalone === next.isStandalone
          ? prev
          : next
      );
    };

    updateClientInfo();

    const media = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      updateClientInfo();
    };

    const handleChange = () => {
      updateClientInfo();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("focus", handleChange);
    window.addEventListener("resize", handleChange);
    document.addEventListener("visibilitychange", handleChange);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(handleChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("focus", handleChange);
      window.removeEventListener("resize", handleChange);
      document.removeEventListener("visibilitychange", handleChange);

      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleChange);
      } else if (typeof media.removeListener === "function") {
        media.removeListener(handleChange);
      }
    };
  }, [isHydrated]);

  const value = useMemo(
    () => ({
      isHydrated,
      deferredPrompt,
      clearPrompt,
      ...clientInfo,
    }),
    [isHydrated, deferredPrompt, clearPrompt, clientInfo]
  );

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext);

  if (!context) {
    throw new Error("usePWAInstall must be used within PWAInstallProvider");
  }

  return context;
}