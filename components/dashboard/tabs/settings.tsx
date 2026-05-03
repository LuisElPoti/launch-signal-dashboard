"use client";

import { useCallback, useEffect, useState } from "react";
import type { IntegrationStatus } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  Database,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

type SettingsCounts = {
  companies: number;
  launches: number;
  fundingRounds: number;
  socialMetrics: number;
  contactMethods: number;
  dmDrafts: number;
  analysisRuns: number;
};

type SettingsResponse = {
  demoMode: boolean;
  generatedAt: string;
  counts: SettingsCounts;
  integrations: IntegrationStatus[];
};

function StatusIcon({ status }: { status: IntegrationStatus["status"] }) {
  if (status === "connected") return <Wifi className="size-4 text-emerald-500" />;
  if (status === "manual") return <Clock className="size-4 text-amber-500" />;
  if (status === "demo") return <AlertTriangle className="size-4 text-amber-500" />;
  return <WifiOff className="size-4 text-muted-foreground" />;
}

const STATUS_LABEL: Record<IntegrationStatus["status"], string> = {
  connected: "Connected",
  manual: "Manual Mode",
  demo: "Demo Mode",
  disconnected: "Disconnected",
};

const STATUS_PILL: Record<IntegrationStatus["status"], string> = {
  connected: "text-emerald-500 bg-emerald-500/10 border-emerald-500/15",
  manual: "text-amber-500 bg-amber-500/10 border-amber-500/15",
  demo: "text-amber-500 bg-amber-500/10 border-amber-500/15",
  disconnected: "text-muted-foreground bg-muted border-border",
};

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export function SettingsTab() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = (await response.json()) as SettingsResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load settings");
      }

      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (loading && !settings) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground flex items-center justify-center gap-2 max-w-3xl">
        <Loader2 className="size-4 animate-spin" />
        Loading live settings...
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="rounded-xl border border-rose-500/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-500 flex items-center gap-2 max-w-3xl">
        <AlertTriangle className="size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const counts = settings?.counts;

  return (
    <div className="space-y-5 max-w-3xl">
      {error && (
        <div className="rounded-xl border border-rose-500/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-500 flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section
        icon={Database}
        title="API Integrations"
        subtitle="Live server-side status. Secrets are never exposed to the browser."
        action={
          <button
            onClick={() => void loadSettings()}
            className="size-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
            aria-label="Refresh settings"
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settings?.integrations.map((integration) => (
            <div
              key={integration.name}
              className="rounded-xl border border-border p-4 bg-muted/20 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={integration.status} />
                  <p className="text-sm font-semibold text-foreground truncate">{integration.name}</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium border rounded-full px-2 py-0.5 shrink-0",
                    STATUS_PILL[integration.status]
                  )}
                >
                  {STATUS_LABEL[integration.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{integration.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={Database}
        title="Database Snapshot"
        subtitle="Counts returned from PostgreSQL through Prisma."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CountCard label="Companies" value={counts?.companies ?? 0} />
          <CountCard label="Launches" value={counts?.launches ?? 0} />
          <CountCard label="Funding Rounds" value={counts?.fundingRounds ?? 0} />
          <CountCard label="Social Metrics" value={counts?.socialMetrics ?? 0} />
          <CountCard label="Contact Methods" value={counts?.contactMethods ?? 0} />
          <CountCard label="DM Drafts" value={counts?.dmDrafts ?? 0} />
          <CountCard label="Analysis Runs" value={counts?.analysisRuns ?? 0} />
        </div>
      </Section>

      <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        Runtime mode:{" "}
        <span className="font-medium text-foreground">
          {settings?.demoMode ? "Demo/fallback forced by DEMO_MODE=true" : "Live integrations when credentials exist"}
        </span>
        {settings?.generatedAt && (
          <span className="block mt-1">
            Last checked {new Date(settings.generatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
