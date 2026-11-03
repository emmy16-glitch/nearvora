"use client";

import * as React from "react";
import { apiFetch } from "@/lib/client/api";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import type { User } from "@/lib/types/domain";
import type { SystemStatus } from "@/lib/config/system";

export interface SessionPayload {
  user: User;
  session: { demo: boolean; issuedAt: number };
  system: SystemStatus;
}

interface SessionContextValue {
  user: User;
  system: SystemStatus;
  demo: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

function SessionGate({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<SessionPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    apiFetch<SessionPayload>("/api/session")
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not open your session.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <Logo />
        <div className="max-w-sm">
          <p className="text-sm font-medium text-fg">We could not open your session</p>
          <p className="mt-1 text-xs leading-5 text-muted">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <Logo />
        <div className="flex items-center gap-2 text-xs text-muted">
          <Spinner />
          Preparing your demo workspace
        </div>
        <p className="max-w-xs text-center text-[11px] leading-5 text-muted-2">
          Demo balances are simulated. No real money is held or moved.
        </p>
      </div>
    );
  }

  const refresh = async () => {
    const payload = await apiFetch<SessionPayload>("/api/session");
    setData(payload);
  };

  return (
    <SessionContext.Provider
      value={{
        user: data.user,
        system: data.system,
        demo: data.session.demo,
        refresh,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SessionGate>{children}</SessionGate>
    </ToastProvider>
  );
}
