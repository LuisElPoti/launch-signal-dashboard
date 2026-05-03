import {
  Rocket,
  DollarSign,
  Heart,
  Eye,
  Linkedin,
} from "lucide-react";
import { computeKpis, type LaunchRow } from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accentClass?: string;
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  accentClass = "bg-primary/10 text-primary",
}: KPICardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className={cn("size-8 rounded-lg flex items-center justify-center", accentClass)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function KPICards({ launches }: { launches: LaunchRow[] }) {
  const KPIS = computeKpis(launches);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <KPICard
        label="Launches Analyzed"
        value={String(KPIS.launchesAnalyzed)}
        icon={Rocket}
        sub={KPIS.launchesAnalyzed > 0 ? "Stored in database" : "No launches imported yet"}
        accentClass="bg-primary/10 text-primary"
      />
      <KPICard
        label="Total Funding"
        value={formatCompactCurrency(KPIS.totalFundingTracked * 1_000_000)}
        icon={DollarSign}
        sub={KPIS.totalFundingTracked > 0 ? "From stored funding rounds" : "No funding data yet"}
        accentClass="bg-emerald-500/10 text-emerald-500 border border-emerald-500/15"
      />
      <KPICard
        label="Avg. X Likes"
        value={formatCompactNumber(KPIS.avgXLikes)}
        icon={Heart}
        sub={KPIS.avgXLikes > 0 ? "Average from stored X metrics" : "No X metrics yet"}
        accentClass="bg-sky-500/10 text-sky-500 border border-sky-500/15"
      />
      <KPICard
        label="Avg. LinkedIn Likes"
        value={formatCompactNumber(KPIS.avgLinkedinLikes)}
        icon={Linkedin}
        sub={KPIS.avgLinkedinLikes > 0 ? "Average from stored LinkedIn metrics" : "No LinkedIn metrics yet"}
        accentClass="bg-blue-500/10 text-blue-500 border border-blue-500/15"
      />
      <KPICard
        label="Avg. Views"
        value={formatCompactNumber(KPIS.avgViews)}
        icon={Eye}
        sub={KPIS.avgViews > 0 ? "Average reach from stored metrics" : "No views yet"}
        accentClass="bg-cyan-500/10 text-cyan-500 border border-cyan-500/15"
      />
    </div>
  );
}
