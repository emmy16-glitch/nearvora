import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function DemoNotice({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/[0.04] px-3.5 py-2.5",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <p className="text-[10.5px] leading-4 text-warning/90">
        <strong className="font-semibold text-warning">Demo mode.</strong>{" "}
        {children ??
          "Balances, addresses, quotes and settlements are simulated. No real money is held or moved."}
      </p>
    </div>
  );
}
