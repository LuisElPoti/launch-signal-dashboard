"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { FundingEngagementChart, PlatformBarChart } from "@/components/dashboard/charts";
import { AISignalCards } from "@/components/dashboard/signal-cards";
import { LaunchesTable } from "@/components/dashboard/launches-table";
import { DetailDrawer } from "@/components/dashboard/detail-drawer";
import { ImportModal } from "@/components/dashboard/import-modal";
import { LaunchTrackerTab } from "@/components/dashboard/tabs/launch-tracker";
import { UnderperformersTab } from "@/components/dashboard/tabs/underperformers";
import { ContactsTab } from "@/components/dashboard/tabs/contacts";
import { DMDraftsTab } from "@/components/dashboard/tabs/dm-drafts";
import { SettingsTab } from "@/components/dashboard/tabs/settings";
import type { LaunchRow } from "@/lib/data";
import {
  AlertTriangle,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Rocket,
  Settings,
  TrendingDown,
  Users,
} from "lucide-react";

const SECTION_META: Record<
  string,
  { title: string; subtitle: string; icon: React.ElementType }
> = {
  dashboard: {
    title: "Launch Intelligence Dashboard",
    subtitle: "Track startup launches, funding signals, social traction, and AI-generated outreach opportunities.",
    icon: LayoutDashboard,
  },
  tracker: {
    title: "Launch Tracker",
    subtitle: "All tracked product launches sorted by date, engagement, and funding stage.",
    icon: Rocket,
  },
  underperformers: {
    title: "Underperformers",
    subtitle: "Companies with significant funding but low launch engagement - prime outreach targets.",
    icon: TrendingDown,
  },
  contacts: {
    title: "Contacts",
    subtitle: "Enriched founder and operator contact data, sorted by confidence score.",
    icon: Users,
  },
  drafts: {
    title: "DM Drafts",
    subtitle: "AI-generated personalized outreach drafts ready to send.",
    icon: MessageSquare,
  },
  settings: {
    title: "Settings & Integrations",
    subtitle: "Review live API connection status and database counts.",
    icon: Settings,
  },
};

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedRow, setSelectedRow] = useState<LaunchRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [launches, setLaunches] = useState<LaunchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLaunches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/launches", { cache: "no-store" });
      const data = (await response.json()) as {
        launches?: LaunchRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load launches");
      }

      setLaunches(data.launches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load launches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLaunches();
  }, [refreshLaunches]);

  const handleDraftGenerated = useCallback((updatedLaunch: LaunchRow) => {
    setLaunches((current) =>
      current.map((launch) => (launch.id === updatedLaunch.id ? updatedLaunch : launch))
    );
    setSelectedRow((current) =>
      current?.id === updatedLaunch.id ? updatedLaunch : current
    );
  }, []);

  const meta = SECTION_META[activeSection] ?? SECTION_META.dashboard;
  const Icon = meta.icon;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          onImport={() => setImportOpen(true)}
          onAnalyze={() => setImportOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="size-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground text-balance">
                  {meta.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
                  {meta.subtitle}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && launches.length === 0 && (
              <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Loading launch intelligence...
              </div>
            )}

            {activeSection === "dashboard" && (
              <>
                <KPICards launches={launches} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-1">
                    <FundingEngagementChart launches={launches} />
                  </div>
                  <div className="xl:col-span-1">
                    <PlatformBarChart launches={launches} />
                  </div>
                  <div className="xl:col-span-1">
                    <AISignalCards launches={launches} />
                  </div>
                </div>
                <LaunchesTable launches={launches} loading={loading} onRowClick={setSelectedRow} />
              </>
            )}

            {activeSection === "tracker" && (
              <LaunchTrackerTab launches={launches} onRowClick={setSelectedRow} />
            )}

            {activeSection === "underperformers" && (
              <UnderperformersTab launches={launches} onRowClick={setSelectedRow} />
            )}

            {activeSection === "contacts" && (
              <ContactsTab launches={launches} onRowClick={setSelectedRow} />
            )}

            {activeSection === "drafts" && (
              <DMDraftsTab
                launches={launches}
                onRowClick={setSelectedRow}
                onDraftGenerated={handleDraftGenerated}
              />
            )}

            {activeSection === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>

      <DetailDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onDraftGenerated={handleDraftGenerated}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshLaunches}
      />
    </div>
  );
}
