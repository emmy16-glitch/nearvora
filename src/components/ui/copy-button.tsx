"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "./toast";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied", description: "Copied to your clipboard.", variant: "success" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it manually.", variant: "error" });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
