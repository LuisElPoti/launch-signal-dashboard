"use client";

import { useState } from "react";
import {
  ExternalLink,
  MessageCircle,
  Mail,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber, formatDateTime } from "@/lib/format";
import { SignalBadge } from "./signal-badge";
import { cn } from "@/lib/utils";

interface LaunchesTableProps {
  launches: LaunchRow[];
  loading?: boolean;
  onRowClick: (row: LaunchRow) => void;
}

type SortKey =
  | "launchScore"
  | "fundingAmountUsd"
  | "xLikes"
  | "linkedinLikes"
  | "views"
  | "engagement"
  | "createdAt";

export function LaunchesTable({ launches, loading = false, onRowClick }: LaunchesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...launches].sort((a, b) => {
    const diff =
      sortKey === "createdAt"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === "desc" ? -diff : diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function ScoreBar({ score }: { score: number }) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-rose-400"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-6">{score}</span>
      </div>
    );
  }

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => handleSort(col)}
    >
      {label}
      <ArrowUpDown className={cn("size-3", sortKey === col && "text-primary")} />
    </button>
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Launch Database</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {launches.length} launches loaded from the API
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg font-mono">
          Database
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Product
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="createdAt" label="Added" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="fundingAmountUsd" label="Funding" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="xLikes" label="X Likes" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="linkedinLikes" label="LinkedIn" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="views" label="Views" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="engagement" label="Engagement" />
              </th>
              <th className="text-left px-4 py-3">
                <SortBtn col="launchScore" label="Score" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Signal
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Contact
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-accent/40 cursor-pointer transition-colors group"
                onClick={() => onRowClick(row)}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {row.company[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm leading-tight">
                        {row.company}
                      </p>
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
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-medium text-foreground">
                    {formatCompactCurrency(row.fundingAmountUsd)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-foreground font-mono">
                    {formatCompactNumber(row.xLikes)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-foreground font-mono">
                    {formatCompactNumber(row.linkedinLikes)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-foreground font-mono">
                    {formatCompactNumber(row.views)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-foreground font-mono">
                    {formatCompactNumber(row.engagement)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <ScoreBar score={row.launchScore} />
                </td>
                <td className="px-4 py-3.5">
                  <SignalBadge signal={row.signal} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {row.contact.email && (
                      <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Mail className="size-2.5" /> Email
                      </span>
                    )}
                    {row.contact.linkedin && (
                      <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                        LI
                      </span>
                    )}
                    {!row.contact.email && !row.contact.linkedin && (
                      <span className="text-xs text-muted-foreground/60">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-2.5 py-1 font-medium transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                    >
                      <MessageCircle className="size-3" />
                      DM Draft
                    </button>
                    <button
                      className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={12} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {loading ? "Loading launches..." : "No launches yet. Import X or LinkedIn URLs to begin."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
