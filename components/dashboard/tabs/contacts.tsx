"use client";

import { useEffect, useState } from "react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactNumber } from "@/lib/format";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  Linkedin,
  AtSign,
  Copy,
  Check,
  UserCheck,
  UserX,
  Search,
  ArrowUpDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ContactsTabProps {
  launches: LaunchRow[];
  onRowClick: (row: LaunchRow) => void;
}

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </button>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{score}%</span>
    </div>
  );
}

type SortKey = "confidenceScore" | "company";
const PAGE_SIZE = 8;

export function ContactsTab({ launches, onRowClick }: ContactsTabProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("confidenceScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showEnrichedOnly, setShowEnrichedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const rows = [...launches]
    .filter((l) => {
      if (showEnrichedOnly && l.contact.confidenceScore < 70) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        l.company.toLowerCase().includes(q) ||
        (l.contact.email ?? "").toLowerCase().includes(q) ||
        (l.contact.xProfile ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortKey === "confidenceScore") {
        const diff = a.contact.confidenceScore - b.contact.confidenceScore;
        return sortDir === "desc" ? -diff : diff;
      }
      const diff = a.company.localeCompare(b.company);
      return sortDir === "desc" ? -diff : diff;
    });
  const paginatedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const enrichedCount = launches.filter((l) => l.contact.confidenceScore >= 70).length;

  useEffect(() => {
    setPage(1);
  }, [launches.length, query, showEnrichedOnly, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: UserCheck,
            label: "Enriched Contacts",
            value: enrichedCount,
            color: "text-emerald-500",
            bg: "bg-emerald-500/8 border-emerald-500/15",
            iconBg: "bg-emerald-500/10 border-emerald-500/15",
          },
          {
            icon: UserX,
            label: "Needs Enrichment",
            value: launches.length - enrichedCount,
            color: "text-amber-500",
            bg: "bg-amber-500/8 border-amber-500/15",
            iconBg: "bg-amber-500/10 border-amber-500/15",
          },
          {
            icon: ShieldCheck,
            label: "With Email",
            value: launches.filter((l) => l.contact.email).length,
            color: "text-indigo-500",
            bg: "bg-indigo-500/8 border-indigo-500/15",
            iconBg: "bg-indigo-500/10 border-indigo-500/15",
          },
        ].map(({ icon: Icon, label, value, color, bg, iconBg }) => (
          <div key={label} className={cn("rounded-2xl border p-4 flex items-center gap-3", bg)}>
            <div className={cn("size-9 rounded-xl border flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("size-4", color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-2xl font-bold", color)}>{formatCompactNumber(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by company or email…"
            className="pl-8 h-8 text-xs w-60 bg-card"
          />
        </div>
        <button
          onClick={() => setShowEnrichedOnly(!showEnrichedOnly)}
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
            showEnrichedOnly
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          )}
        >
          Enriched only
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => toggleSort("confidenceScore")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Confidence
            <ArrowUpDown className={cn("size-3", sortKey === "confidenceScore" && "text-primary")} />
          </button>
          <button
            onClick={() => toggleSort("company")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Company
            <ArrowUpDown className={cn("size-3", sortKey === "company" && "text-primary")} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Contact Directory</p>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
            {rows.length} shown
          </span>
        </div>

        <div className="divide-y divide-border">
          {paginatedRows.map((row) => {
            const c = row.contact;
            const hasAll = c.email && c.linkedin;
            return (
              <div
                key={row.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-accent/30 cursor-pointer transition-colors group"
                onClick={() => onRowClick(row)}
              >
                {/* Avatar */}
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border",
                  c.confidenceScore >= 80
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/15"
                    : c.confidenceScore >= 50
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/15"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/15"
                )}>
                  {row.company[0]}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm">{row.company}</p>
                    <span className="text-xs text-muted-foreground">{row.stage}</span>
                    <SignalBadge signal={row.signal} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {c.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="size-3 shrink-0 text-primary/70" />
                        <span className="truncate">{c.email}</span>
                        <CopyInline text={c.email} />
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="size-3 shrink-0" />
                        <span>{c.phone}</span>
                        <CopyInline text={c.phone} />
                      </div>
                    )}
                    {c.linkedin && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Linkedin className="size-3 shrink-0 text-[#0077b5]" />
                        <a
                          href={c.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {c.xProfile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AtSign className="size-3 shrink-0" />
                        <span>{c.xProfile}</span>
                        <CopyInline text={c.xProfile} />
                      </div>
                    )}
                    {!c.email && !c.phone && !c.linkedin && !c.xProfile && (
                      <p className="text-xs text-muted-foreground/60 col-span-2">No contact data found — enrichment needed</p>
                    )}
                  </div>
                </div>

                {/* Confidence + action */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ConfidenceBar score={c.confidenceScore} />
                  {hasAll ? (
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5 font-medium">
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/15 rounded-full px-2 py-0.5 font-medium">
                      Partial
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No contacts match your current filters.
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={rows.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
