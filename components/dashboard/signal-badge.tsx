import { cn } from "@/lib/utils";
import type { SignalTag } from "@/lib/data";

interface SignalBadgeProps {
  signal: SignalTag;
  className?: string;
}

const BADGE_CONFIG: Record<
  SignalTag,
  { label: string; className: string }
> = {
  underperforming: {
    label: "Underperforming",
    className: "bg-rose-500/10 text-rose-500 border-rose-500/15",
  },
  strong_launch: {
    label: "Strong Launch",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/15",
  },
  needs_enrichment: {
    label: "Needs Enrichment",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/15",
  },
  dm_ready: {
    label: "DM Ready",
    className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/15",
  },
  normal: {
    label: "Normal",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function SignalBadge({ signal, className }: SignalBadgeProps) {
  const { label, className: badgeClass } = BADGE_CONFIG[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border",
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  );
}
