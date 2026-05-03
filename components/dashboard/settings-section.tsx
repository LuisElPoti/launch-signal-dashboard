import { Wifi, WifiOff, AlertTriangle, Clock } from "lucide-react";
import type { IntegrationStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: IntegrationStatus["status"] }) {
  if (status === "connected")
    return <Wifi className="size-3.5 text-emerald-500" />;
  if (status === "manual")
    return <Clock className="size-3.5 text-amber-500" />;
  if (status === "demo")
    return <AlertTriangle className="size-3.5 text-amber-500" />;
  return <WifiOff className="size-3.5 text-muted-foreground" />;
}

const STATUS_LABELS: Record<IntegrationStatus["status"], string> = {
  connected: "Connected",
  manual: "Manual Mode",
  demo: "Demo Mode",
  disconnected: "Disconnected",
};

const STATUS_CLASSES: Record<
  IntegrationStatus["status"],
  string
> = {
  connected: "text-emerald-500 bg-emerald-500/10 border-emerald-500/15",
  manual: "text-amber-500 bg-amber-500/10 border-amber-500/15",
  demo: "text-amber-500 bg-amber-500/10 border-amber-500/15",
  disconnected: "text-muted-foreground bg-muted border-border",
};

export function SettingsSection({ integrations = [] }: { integrations?: IntegrationStatus[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">API Integrations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Data source connection status
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="rounded-xl border border-border p-3.5 bg-muted/30 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {integration.name}
              </p>
              <StatusIcon status={integration.status} />
            </div>
            <span
              className={cn(
                "text-xs font-medium border rounded-full px-2 py-0.5 w-fit",
                STATUS_CLASSES[integration.status]
              )}
            >
              {STATUS_LABELS[integration.status]}
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {integration.detail}
            </p>
          </div>
        ))}
        {integrations.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-3.5 bg-muted/20 text-xs text-muted-foreground sm:col-span-2 xl:col-span-4">
            No integration status loaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
