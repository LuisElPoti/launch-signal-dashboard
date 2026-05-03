"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  Mail,
  Phone,
  Linkedin,
  AtSign,
  ExternalLink,
  Brain,
  TrendingUp,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { LaunchRow } from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber, formatDate } from "@/lib/format";
import { SignalBadge } from "./signal-badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DetailDrawerProps {
  row: LaunchRow | null;
  onClose: () => void;
  onDraftGenerated?: (row: LaunchRow) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function DetailDrawer({ row, onClose, onDraftGenerated }: DetailDrawerProps) {
  const [markedContacted, setMarkedContacted] = useState(false);
  const [activeDM, setActiveDM] = useState<"x" | "linkedin">("x");
  const [regenerating, setRegenerating] = useState(false);

  if (!row) return null;

  async function handleRegenerate() {
    if (!row) return;
    setRegenerating(true);
    try {
      const response = await fetch("/api/dm-drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId: row.id,
          platform: activeDM === "x" ? "X" : "LINKEDIN",
          tone: "warm",
        }),
      });
      const data = (await response.json()) as { launch?: LaunchRow; error?: string };
      if (!response.ok || !data.launch) {
        throw new Error(data.error ?? "Failed to regenerate draft");
      }
      onDraftGenerated?.(data.launch);
      toast.success("DM draft regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate draft");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {row.company[0]}
              </div>
              <div>
                <p className="font-semibold text-foreground">{row.company}</p>
                <p className="text-xs text-muted-foreground">{row.product}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SignalBadge signal={row.signal} />
            <button
              onClick={onClose}
              className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Company Overview */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Company Overview
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Stage", value: row.stage },
                { label: "Funding", value: formatCompactCurrency(row.fundingAmountUsd) },
                { label: "Launch Date", value: formatDate(row.launchDate) },
                { label: "Launch Score", value: String(row.launchScore) + " / 100" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Investors</p>
              <div className="flex flex-wrap gap-1.5">
                {row.investors.map((inv) => (
                  <span
                    key={inv}
                    className="text-xs bg-card border border-border rounded-lg px-2 py-0.5 text-foreground"
                  >
                    {inv}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Launch Post Preview */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Launch Post Preview
            </h4>
            <div className="bg-muted/40 rounded-xl border border-border p-4">
              <p className="text-sm text-foreground leading-relaxed italic">
                &ldquo;{row.launchPreview}&rdquo;
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCompactNumber(row.xLikes)}</span> X likes
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCompactNumber(row.linkedinLikes)}</span> LinkedIn likes
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCompactNumber(row.views)}</span> views
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCompactNumber(row.engagement)}</span> engagement
                </div>
                <a
                  href={row.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View original <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </section>

          {/* Contact Methods */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Contact Methods
            </h4>
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Confidence score header */}
              <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Confidence score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.contact.confidenceScore >= 80
                          ? "bg-emerald-500"
                          : row.contact.confidenceScore >= 50
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      )}
                      style={{ width: `${row.contact.confidenceScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {row.contact.confidenceScore}%
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border">
                {[
                  { icon: Mail, label: "Email", value: row.contact.email },
                  { icon: Phone, label: "Phone", value: row.contact.phone },
                  { icon: Linkedin, label: "LinkedIn", value: row.contact.linkedin },
                  { icon: AtSign, label: "X Profile", value: row.contact.xProfile },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                    {value ? (
                      <span className="text-xs text-foreground font-medium flex-1 truncate">
                        {value}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 flex-1">Not found</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI Analysis */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              AI Analysis
            </h4>
            <div className="space-y-2.5">
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/8 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="size-3.5 text-rose-500" />
                  <p className="text-xs font-semibold text-rose-500">
                    Performance diagnosis
                  </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {row.aiAnalysis.whyUnderperforming}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/8 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="size-3.5 text-indigo-500" />
                  <p className="text-xs font-semibold text-indigo-500">
                    Suggested next move
                  </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {row.aiAnalysis.suggestedAngle}
                </p>
              </div>
            </div>
          </section>

          {/* DM Drafts */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              DM Drafts
            </h4>

            {/* Platform toggle */}
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-3">
              {(["x", "linkedin"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDM(tab)}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors",
                    activeDM === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "x" ? "X / Twitter" : "LinkedIn"}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {activeDM === "x" ? row.dmDraftX : row.dmDraftLinkedin}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <CopyButton
                text={activeDM === "x" ? row.dmDraftX : row.dmDraftLinkedin}
              />
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => void handleRegenerate()}
                disabled={regenerating}
              >
                {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Regenerate
              </button>
              <button
                className={cn(
                  "ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border",
                  markedContacted
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/15"
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                )}
                onClick={() => setMarkedContacted(!markedContacted)}
              >
                <CheckCircle className="size-3.5" />
                {markedContacted ? "Contacted" : "Mark as contacted"}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
