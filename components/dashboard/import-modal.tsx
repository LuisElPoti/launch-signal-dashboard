"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const OPTIONS = [
  { id: "x_metrics", label: "Fetch X metrics", defaultChecked: true },
  { id: "linkedin_metrics", label: "Use manual LinkedIn metrics", defaultChecked: false },
  { id: "enrich_funding", label: "Enrich funding data", defaultChecked: true },
  { id: "enrich_contacts", label: "Enrich contact methods", defaultChecked: true },
  { id: "generate_dm", label: "Generate DM drafts for low performers", defaultChecked: true },
];

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [urls, setUrls] = useState("");
  const [options, setOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(OPTIONS.map((o) => [o.id, o.defaultChecked]))
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentUrl?: string;
  } | null>(null);
  const [results, setResults] = useState<Array<{
    url: string;
    status: "success" | "failed";
    error?: string;
  }>>([]);

  if (!open) return null;

  const hasResults = results.length > 0;
  const hasFailures = results.some((result) => result.status === "failed");

  function toggleOption(id: string) {
    setOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleFinish() {
    setDone(false);
    setProgress(null);
    setResults([]);
    setUrls("");
    onClose();
  }

  async function handleAnalyze() {
    if (!urls.trim()) return;

    const cleanUrls = urls
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);

    setLoading(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: cleanUrls.length });

    let imported = 0;
    const failed: string[] = [];

    try {
      for (const [index, url] of cleanUrls.entries()) {
        setProgress({ current: index + 1, total: cleanUrls.length, currentUrl: url });

        const response = await fetch("/api/import-launches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: [url],
            options: {
              fetchXMetrics: Boolean(options.x_metrics),
              enrichFunding: Boolean(options.enrich_funding),
              enrichContacts: Boolean(options.enrich_contacts),
              generateDmDrafts: Boolean(options.generate_dm),
            },
          }),
        });

        const data = (await response.json()) as {
          imported?: number;
          error?: string;
          results?: Array<{ imported: boolean; error?: string }>;
        };

        if (!response.ok) {
          failed.push(url);
          setResults((current) => [
            ...current,
            { url, status: "failed", error: data.error ?? "Import failed" },
          ]);
          continue;
        }

        imported += data.imported ?? 0;
        if (data.results?.some((result) => !result.imported)) {
          const error = data.results.find((result) => !result.imported)?.error;
          failed.push(url);
          setResults((current) => [
            ...current,
            { url, status: "failed", error: error ?? "Import failed" },
          ]);
        } else {
          setResults((current) => [...current, { url, status: "success" }]);
        }
      }

      setDone(true);
      if (failed.length) {
        toast.warning(`Imported ${imported}; ${failed.length} failed`);
      } else {
        toast.success(`Imported ${imported} launch${imported === 1 ? "" : "es"}`);
      }

      await onImported();
      setProgress(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Analyze Launch URLs</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste X or LinkedIn URLs to begin analysis
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Launch URLs
              </label>
              <textarea
                className="w-full h-32 text-xs font-mono bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                placeholder={`https://x.com/fluxops/status/9876543210\nhttps://x.com/axonlabs/status/1122334455\nhttps://linkedin.com/posts/nomad-intelligence_...`}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                disabled={loading || done}
              />
              <p className="text-xs text-muted-foreground mt-1">
                One URL per line. Supports X (Twitter) and LinkedIn post URLs.
              </p>
            </div>

            {progress && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">
                    Progress {progress.current}/{progress.total}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
                {progress.currentUrl && (
                  <p className="mt-2 truncate text-xs text-muted-foreground font-mono">
                    {progress.currentUrl}
                  </p>
                )}
              </div>
            )}

            {hasResults && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 max-h-36 overflow-y-auto">
                <p className="text-xs font-medium text-foreground mb-2">Import result</p>
                <div className="space-y-1.5">
                  {results.map((result) => (
                    <div key={`${result.url}:${result.status}`} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            result.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        <span className="truncate font-mono text-muted-foreground">
                          {result.url}
                        </span>
                      </div>
                      {result.error && (
                        <p className="pl-3.5 text-rose-500 leading-relaxed">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Analysis Options
              </p>
              <div className="space-y-2">
                {OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div
                      className={cn(
                        "size-4 rounded flex items-center justify-center border transition-colors",
                        options[opt.id]
                          ? "bg-primary border-primary"
                          : "bg-background border-border group-hover:border-muted-foreground"
                      )}
                      onClick={() => toggleOption(opt.id)}
                    >
                      {options[opt.id] && (
                        <svg
                          className="size-2.5 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-4 border-t border-border flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleFinish}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
              onClick={() => (done ? handleFinish() : void handleAnalyze())}
              disabled={loading || (!done && !urls.trim())}
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {done && <CheckCircle2 className="size-3.5 text-emerald-400" />}
              {loading && progress
                ? `Analyzing ${progress.current}/${progress.total}`
                : done
                  ? hasFailures
                    ? "Finish"
                    : "Finish"
                  : "Start Analysis"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
