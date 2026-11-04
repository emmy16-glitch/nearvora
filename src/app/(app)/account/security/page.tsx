"use client";

import * as React from "react";
import { Fingerprint, KeyRound, Lock, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AccountScreen } from "@/components/account/account-shell";
import { cn } from "@/lib/utils/cn";

function Toggle({
  label,
  description,
  enabled,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-3.5 last:border-b-0">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-lavender">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative mt-1 h-6 w-11 shrink-0 rounded-full border transition-colors",
          enabled ? "border-accent bg-accent" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-[18px] rounded-full bg-white transition-transform",
            enabled ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export default function SecurityPage() {
  const { toast } = useToast();
  const [biometric, setBiometric] = React.useState(true);
  const [twoFactor, setTwoFactor] = React.useState(true);
  const [alerts, setAlerts] = React.useState(true);
  const [pinOpen, setPinOpen] = React.useState(false);
  const [currentPin, setCurrentPin] = React.useState("");
  const [nextPin, setNextPin] = React.useState("");

  const update = (label: string, value: boolean, setter: (next: boolean) => void) => {
    setter(value);
    toast({
      title: `${label} ${value ? "enabled" : "disabled"}`,
      description: "Preference updated for this demo session.",
      variant: "success",
    });
  };

  return (
    <AccountScreen title="Security Settings" action={<ShieldCheck className="size-5 text-muted-2" />}>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-success/12 text-success">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-fg">Your account is protected</p>
            <p className="text-[10.5px] text-muted">Signed demo session · backend-enforced approvals</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface px-4">
        <Toggle
          label="Biometric unlock"
          description="Require Face ID or fingerprint before opening the app."
          enabled={biometric}
          onChange={(value) => update("Biometric unlock", value, setBiometric)}
          icon={<Fingerprint className="size-4" />}
        />
        <Toggle
          label="Two-factor authentication"
          description="Confirm sign-in with an authenticator code."
          enabled={twoFactor}
          onChange={(value) => update("Two-factor authentication", value, setTwoFactor)}
          icon={<Smartphone className="size-4" />}
        />
        <Toggle
          label="Security alerts"
          description="Notify me about new devices and unusual activity."
          enabled={alerts}
          onChange={(value) => update("Security alerts", value, setAlerts)}
          icon={<Lock className="size-4" />}
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">Sign-in & PIN</h2>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-3 text-left transition-colors hover:bg-surface-2"
          >
            <KeyRound className="size-4 text-lavender" />
            <span className="flex-1 text-[11.5px] font-medium text-fg">Change transaction PIN</span>
            <span className="text-[10px] text-muted-2">Configured</span>
          </button>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-3">
            <Smartphone className="size-4 text-lavender" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-fg">Current session</p>
              <p className="text-[9.5px] text-muted-2">This device · signed demo cookie</p>
            </div>
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast({ title: "Demo sessions", description: "No other sessions are active.", variant: "info" })
          }
        >
          <LogOut className="size-3.5" /> Review active sessions
        </Button>
      </div>

      <Modal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Change transaction PIN"
        description="Demo only. No PIN is stored or changed."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPinOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={currentPin.length < 4 || nextPin.length < 4}
              onClick={() => {
                setPinOpen(false);
                setCurrentPin("");
                setNextPin("");
                toast({
                  title: "PIN not changed",
                  description: "PIN changes are disabled in demo mode.",
                  variant: "info",
                });
              }}
            >
              Save PIN
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="current-pin" className="mb-1.5 block text-xs font-medium text-muted">
              Current PIN
            </label>
            <input
              id="current-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ""))}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label htmlFor="next-pin" className="mb-1.5 block text-xs font-medium text-muted">
              New PIN
            </label>
            <input
              id="next-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={nextPin}
              onChange={(event) => setNextPin(event.target.value.replace(/\D/g, ""))}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-accent/60"
            />
          </div>
        </div>
      </Modal>
    </AccountScreen>
  );
}
