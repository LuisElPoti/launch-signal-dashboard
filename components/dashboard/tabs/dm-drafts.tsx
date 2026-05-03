"use client";

import { useMemo, useState } from "react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactNumber } from "@/lib/format";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  RefreshCw,
  CheckCircle,
  MessageCircle,
  AtSign,
  Linkedin,
  Search,
  Send,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DMDraftsTabProps {
  launches: LaunchRow[];
  onRowClick: (row: LaunchRow) => void;
  onDraftGenerated: (row: LaunchRow) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function DMDraftsTab({ launches, onRowClick, onDraftGenerated }: DMDraftsTabProps) {
  const [platform, setPlatform] = useState<"x" | "linkedin">("x");
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState<"all" | "with" | "missing">("all");
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const draftRows = useMemo(
    () =>
      [...launches].sort((a, b) => {
        if (a.signal === "dm_ready" && b.signal !== "dm_ready") return -1;
        if (b.signal === "dm_ready" && a.signal !== "dm_ready") return 1;
        return b.contact.confidenceScore - a.contact.confidenceScore;
      }),
    [launches]
  );

  function toggleContacted(id: string) {
    setContacted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRegenerate(row: LaunchRow) {
    const key = `${row.id}:${platform}`;
    setRegenerating(key);
    try {
      const response = await fetch("/api/dm-drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId: row.id,
          platform: platform === "x" ? "X" : "LINKEDIN",
          tone: "warm",
        }),
      });
      const data = (await response.json()) as { launch?: LaunchRow; error?: string };
      if (!response.ok || !data.launch) {
        throw new Error(data.error ?? "Failed to regenerate draft");
      }
      onDraftGenerated(data.launch);
      toast.success("DM draft regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate draft");
    } finally {
      setRegenerating(null);
    }
  }

  const rows = draftRows.filter((launch) => {
    const draft = platform === "x" ? launch.dmDraftX : launch.dmDraftLinkedin;
    if (draftFilter === "with" && !draft.trim()) return false;
    if (draftFilter === "missing" && draft.trim()) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return launch.company.toLowerCase().includes(q) || launch.product.toLowerCase().includes(q);
  });

  const sentCount = contacted.size;
  const readyCount = launches.filter((launch) => launch.signal === "dm_ready").length;
  const withDraftCount = launches.filter((launch) =>
    (platform === "x" ? launch.dmDraftX : launch.dmDraftLinkedin).trim()
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Launches", value: launches.length, color: "text-primary", bg: "bg-accent border-primary/20" },
          { label: "With Draft", value: withDraftCount, color: "text-emerald-500", bg: "bg-emerald-500/8 border-emerald-500/15" },
          { label: "DM Ready", value: readyCount, color: "text-emerald-500", bg: "bg-emerald-500/8 border-emerald-500/15" },
          { label: "Marked Sent", value: sentCount, color: "text-indigo-500", bg: "bg-indigo-500/8 border-indigo-500/15" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn("rounded-2xl border p-4", bg)}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold mt-1", color)}>{formatCompactNumber(value)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter drafts..."
            className="pl-8 h-8 text-xs w-52 bg-card"
          />
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {[
            { id: "all", label: "All" },
            { id: "with", label: "With draft" },
            { id: "missing", label: "Missing" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDraftFilter(item.id as typeof draftFilter)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                draftFilter === item.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-1 ml-auto">
          <button
            onClick={() => setPlatform("x")}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
              platform === "x" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AtSign className="size-3" />
            X / Twitter
          </button>
          <button
            onClick={() => setPlatform("linkedin")}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
              platform === "linkedin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Linkedin className="size-3" />
            LinkedIn
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const isContacted = contacted.has(row.id);
          const draft = platform === "x" ? row.dmDraftX : row.dmDraftLinkedin;
          const handle = platform === "x" ? row.contact.xProfile : row.contact.linkedin;
          const isRegenerating = regenerating === `${row.id}:${platform}`;

          return (
            <div
              key={row.id}
              className={cn(
                "bg-card rounded-2xl border shadow-sm overflow-hidden transition-colors",
                isContacted ? "border-emerald-500/20 opacity-70" : "border-border"
              )}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                      row.signal === "dm_ready"
                        ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/15"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {row.company[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{row.company}</p>
                      <SignalBadge signal={row.signal} />
                    </div>
                    <p className="text-xs text-muted-foreground">{row.product}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {handle && (
                    <span className="text-xs text-muted-foreground bg-muted rounded-lg px-2 py-1 font-mono truncate max-w-32">
                      {platform === "x" ? handle : "LinkedIn"}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-semibold rounded-full px-2 py-0.5 border",
                      row.contact.confidenceScore >= 80
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                        : row.contact.confidenceScore >= 50
                          ? "text-amber-500 bg-amber-500/10 border-amber-500/15"
                          : "text-rose-500 bg-rose-500/10 border-rose-500/15"
                    )}
                  >
                    {row.contact.confidenceScore}%
                  </span>
                </div>
              </div>

              <div className="px-5 pt-4 pb-3">
                <div
                  className={cn(
                    "rounded-xl p-4 border text-sm leading-relaxed text-foreground whitespace-pre-wrap",
                    isContacted
                      ? "bg-emerald-500/8 border-emerald-500/15 text-muted-foreground"
                      : "bg-muted/30 border-border"
                  )}
                >
                  {draft || "No draft yet. Generate one from this launch."}
                </div>
              </div>

              <div className="flex items-center gap-2 px-5 pb-4">
                <CopyButton text={draft} />
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => void handleRegenerate(row)}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Regenerate
                </button>
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => onRowClick(row)}
                >
                  <MessageCircle className="size-3.5" />
                  Full analysis
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border",
                      isContacted
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/15 hover:bg-emerald-500/15"
                        : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    )}
                    onClick={() => toggleContacted(row.id)}
                  >
                    <CheckCircle className="size-3.5" />
                    {isContacted ? "Contacted" : "Mark contacted"}
                  </button>
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => {
                      const url =
                        platform === "x"
                          ? row.contact.xProfile ?? row.launchUrl
                          : row.contact.linkedin ?? row.launchUrl;
                      window.open(url, "_blank");
                    }}
                  >
                    <Send className="size-3" />
                    Open in {platform === "x" ? "X" : "LinkedIn"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-12 text-center text-sm text-muted-foreground">
            No drafts match your search.
          </div>
        )}
      </div>
    </div>
  );
}
