"use client";

import { BadgeCheck, Mail, Phone, UserRound } from "lucide-react";
import { useSession } from "@/components/providers";
import { formatDate } from "@/lib/money/format";
import { Badge } from "@/components/ui/badge";
import { AccountScreen, InfoRow } from "@/components/account/account-shell";

export default function ProfilePage() {
  const { user } = useSession();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AccountScreen title="Profile Information" action={<UserRound className="size-5 text-muted-2" />}>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-xl font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-fg">{user.name}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
              <BadgeCheck className="size-3.5" /> Verified account
            </p>
          </div>
          <Badge variant="warning" className="ml-auto">
            Demo
          </Badge>
        </div>
        <div className="mt-5">
          <InfoRow label="Full name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="Account type" value="Personal wallet" />
          <InfoRow label="Member since" value={formatDate(user.createdAt)} />
          <InfoRow label="User ID" value={user.id} mono />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-fg">Contact details</h2>
        <div className="mt-3 space-y-2">
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-[11.5px] text-muted transition-colors hover:text-fg"
          >
            <Mail className="size-4 text-lavender" /> {user.email}
          </a>
          <a
            href={`tel:${user.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-[11.5px] text-muted transition-colors hover:text-fg"
          >
            <Phone className="size-4 text-lavender" /> {user.phone}
          </a>
        </div>
      </section>

      <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-[10.5px] leading-4 text-muted">
        Profile editing is disabled in this demo build. In production, changes would require
        re-verification and would be recorded in the audit trail.
      </div>
    </AccountScreen>
  );
}
