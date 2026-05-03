"use client";

import { useEffect, useState } from "react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatDateTime } from "@/lib/format";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  ChevronRight,
  MessageCircle,
  ArrowUpDown,
  CalendarDays,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type SortKey =
  | "launchScore"
  | "fundingAmountUsd"
  | "xLikes"
  | "linkedinLikes"
  | "views"
  | "engagement"
  | "launchDate"
  | "createdAt";

interface LaunchTrackerProps {
  launches: LaunchRow[];
  onRowClick: (row: LaunchRow) => void;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-rose-400"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums w-6">{score}</span>
    </div>
  );
}

const SIGNAL_FILTERS = ["all", "underperforming", "strong_launch", "dm_ready", "needs_enrichment", "normal"] as const;
type SignalFilter = (typeof SIGNAL_FILTERS)[number];

const FILTER_LABELS: Record<SignalFilter, string> = {
  all: "All",
  underperforming: "Underperforming",
  strong_launch: "Strong Launch",
  dm_ready: "DM Ready",
  needs_enrichment: "Needs Enrichment",
  normal: "Normal",
};

const PAGE_SIZE = 10;

export function LaunchTrackerTab({ launches, onRowClick }: LaunchTrackerProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<SignalFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = launches
    .filter((l) => filter === "all" || l.signal === filter)
    .filter((l) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        l.company.toLowerCase().includes(q) ||
        l.product.toLowerCase().includes(q) ||
        l.stage.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortKey === "launchDate") {
        const diff = new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime();
        return sortDir === "desc" ? -diff : diff;
      }
      if (sortKey === "createdAt") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "desc" ? -diff : diff;
      }
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -diff : diff;
    });
  const paginatedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [launches.length, filter, query, sortKey, sortDir]);

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {label}
        <ArrowUpDown className={cn("size-3 shrink-0", sortKey === col && "text-primary")} />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by company or product…"
            className="pl-8 h-8 text-xs w-60 bg-card"
          />
        </div>

        {/* Signal chips */}
        <div className="flex items-center gap-1.5 ml-auto">
          <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
          {SIGNAL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            All Tracked Launches
          </p>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
            {filtered.length} / {launches.length} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3"><SortBtn col="launchDate" label="Date" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="createdAt" label="Added" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="fundingAmountUsd" label="Funding" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="xLikes" label="X Likes" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="linkedinLikes" label="LinkedIn" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="views" label="Views" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="engagement" label="Engagement" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="launchScore" label="Score" /></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Signal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {row.company[0]}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">{row.company}</p>
                        <p className="text-xs text-muted-foreground">{row.stage}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-foreground truncate max-w-36">{row.product}</p>
                    <a
                      href={row.launchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View post <ExternalLink className="size-2.5" />
                    </a>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {formatDate(row.launchDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-medium text-foreground">{formatCompactCurrency(row.fundingAmountUsd)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono text-foreground">{formatCompactNumber(row.xLikes)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono text-foreground">{formatCompactNumber(row.linkedinLikes)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono text-foreground">{formatCompactNumber(row.views)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono text-foreground">{formatCompactNumber(row.engagement)}</span>
                  </td>
                  <td className="px-4 py-3.5"><ScoreBar score={row.launchScore} /></td>
                  <td className="px-4 py-3.5"><SignalBadge signal={row.signal} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-2.5 py-1 font-medium transition-colors flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
                      >
                        <MessageCircle className="size-3" />
                        DM Draft
                      </button>
                      <button
                        className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No launches match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
