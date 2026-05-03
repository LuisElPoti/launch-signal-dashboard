import {
  TrendingDown,
  Flame,
  UserX,
  MessageCircle,
} from "lucide-react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  count: number;
  accentClass: string;
  bgClass: string;
}

function SignalCard({
  icon: Icon,
  label,
  description,
  count,
  accentClass,
  bgClass,
}: SignalCardProps) {
  return (
    <div className={cn("rounded-xl border p-4 flex gap-3 items-start", bgClass)}>
      <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", accentClass)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <span className={cn("text-xs font-bold rounded-full px-2 py-0.5", accentClass)}>
            {formatCompactNumber(count)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function AISignalCards({ launches }: { launches: LaunchRow[] }) {
  const underperforming = launches.filter(
    (l) => l.signal === "underperforming"
  ).length;
  const strong = launches.filter((l) => l.signal === "strong_launch").length;
  const needsEnrichment = launches.filter(
    (l) => l.signal === "needs_enrichment"
  ).length;
  const dmReady = launches.filter((l) => l.signal === "dm_ready").length;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          AI Opportunity Signals
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Counts from stored launches
        </p>
      </div>

      <div className="space-y-3">
        <SignalCard
          icon={TrendingDown}
          label="High funding / low traction"
          description="Raised significant capital but launch engagement is well below category benchmarks."
          count={underperforming}
          accentClass="bg-rose-500/10 text-rose-500"
          bgClass="bg-rose-500/8 border-rose-500/15"
        />
        <SignalCard
          icon={Flame}
          label="Strong organic launch"
          description="Outperforming peer benchmarks. Good candidates for partnership or referral intros."
          count={strong}
          accentClass="bg-emerald-500/10 text-emerald-500"
          bgClass="bg-emerald-500/8 border-emerald-500/15"
        />
        <SignalCard
          icon={UserX}
          label="Missing contact data"
          description="No enriched contact found. Run the contact enrichment step before outreach."
          count={needsEnrichment}
          accentClass="bg-amber-500/10 text-amber-500"
          bgClass="bg-amber-500/8 border-amber-500/15"
        />
        <SignalCard
          icon={MessageCircle}
          label="Ready for outreach"
          description="High-confidence contact + positive launch signals. DM drafts pre-generated."
          count={dmReady}
          accentClass="bg-primary/10 text-primary"
          bgClass="bg-primary/5 border-primary/15"
        />
      </div>
    </div>
  );
}
