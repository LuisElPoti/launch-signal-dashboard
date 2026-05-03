"use client";

import type { LaunchRow } from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber, formatDate } from "@/lib/format";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart2,
  MessageCircle,
  ChevronRight,
  Brain,
} from "lucide-react";

interface UnderperformersProps {
  launches: LaunchRow[];
  onRowClick: (row: LaunchRow) => void;
}

function GapIndicator({ funding, score }: { funding: number; score: number }) {
  // Gap = high funding + low score
  const gap = Math.round((funding / 25) * 50 + (100 - score) * 0.5);
  const capped = Math.min(gap, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-rose-400"
          style={{ width: `${capped}%` }}
        />
      </div>
      <span className="text-xs font-mono text-rose-500 tabular-nums">{capped}</span>
    </div>
  );
}

export function UnderperformersTab({ launches, onRowClick }: UnderperformersProps) {
  const underperformers = launches
    .filter((l) => l.signal === "underperforming")
    .sort((a, b) => b.fundingRaised - a.fundingRaised);
  const totalFundingMissed = underperformers.reduce((s, l) => s + l.fundingRaised, 0);
  const avgScore = Math.round(
    underperformers.reduce((s, l) => s + l.launchScore, 0) / (underperformers.length || 1)
  );

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: AlertTriangle,
            label: "Underperforming",
            value: String(underperformers.length),
            sub: "of " + launches.length + " tracked",
            color: "text-rose-500",
            bg: "bg-rose-500/8 border-rose-500/15",
            iconBg: "bg-rose-500/10",
          },
          {
            icon: DollarSign,
            label: "Total Funding",
            value: formatCompactCurrency(totalFundingMissed * 1_000_000),
            sub: "raised by these companies",
            color: "text-amber-500",
            bg: "bg-amber-500/8 border-amber-500/15",
            iconBg: "bg-amber-500/10",
          },
          {
            icon: BarChart2,
            label: "Avg Launch Score",
            value: String(avgScore) + " / 100",
            sub: underperformers.length > 0 ? "average stored score" : "no rows yet",
            color: "text-primary",
            bg: "bg-primary/8 border-primary/15",
            iconBg: "bg-primary/10",
          },
        ].map(({ icon: Icon, label, value, sub, color, bg, iconBg }) => (
          <div key={label} className={cn("rounded-2xl border p-4 flex items-start gap-3", bg)}>
            <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("size-4", color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {underperformers.map((row) => (
          <div
            key={row.id}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => onRowClick(row)}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex flex-col min-[460px]:flex-row min-[460px]:items-start justify-between gap-3 min-[460px]:gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/15 flex items-center justify-center text-sm font-bold shrink-0">
                    {row.company[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{row.company}</p>
                    <p className="text-sm text-muted-foreground">{row.product}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SignalBadge signal={row.signal} />
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                {[
                  { label: "Funding", value: formatCompactCurrency(row.fundingAmountUsd), highlight: true },
                  { label: "Launch Score", value: `${row.launchScore} / 100`, highlight: false },
                  { label: "X Likes", value: formatCompactNumber(row.xLikes), highlight: false },
                  { label: "LinkedIn", value: formatCompactNumber(row.linkedinLikes), highlight: false },
                  { label: "Views", value: formatCompactNumber(row.views), highlight: false },
                  { label: "Engagement", value: formatCompactNumber(row.engagement), highlight: false },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={cn("rounded-xl p-3", highlight ? "bg-rose-500/8 border border-rose-500/15" : "bg-muted/50")}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-sm font-semibold mt-0.5", highlight ? "text-rose-500" : "text-foreground")}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Opportunity gap */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="size-3.5 text-rose-500" />
                  <span className="text-xs font-medium text-muted-foreground">Opportunity gap</span>
                </div>
                <GapIndicator funding={row.fundingRaised} score={row.launchScore} />
              </div>

              {/* AI insight */}
              <div className="rounded-xl bg-muted/40 border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Brain className="size-3.5 text-indigo-500" />
                  <span className="text-xs font-semibold text-muted-foreground">AI Insight</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                  {row.aiAnalysis.whyUnderperforming}
                </p>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground leading-relaxed">
                Launched {formatDate(row.launchDate, { month: "long" })}
                {" · "}
                {row.stage} · {row.investors[0]}
                {row.investors.length > 1 && ` +${row.investors.length - 1}`}
              </span>
              <button
                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-2.5 py-1 font-medium transition-colors flex items-center justify-center gap-1 w-full min-[520px]:w-auto"
                onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
              >
                <MessageCircle className="size-3" />
                View DM Draft
              </button>
            </div>
          </div>
        ))}
        {underperformers.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-12 text-center text-sm text-muted-foreground">
            No underperforming launches yet. Import launches with funding and engagement data to surface opportunities.
          </div>
        )}
      </div>
    </div>
  );
}
