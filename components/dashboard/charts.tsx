"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import {
  toBarData,
  toScatterData,
  type LaunchRow,
  type ScatterPoint,
} from "@/lib/data";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/format";

// ─── Signal colors ─────────────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<string, string> = {
  underperforming: "#e84f4f",
  strong_launch: "#22c55e",
  needs_enrichment: "#f59e0b",
  dm_ready: "#6366f1",
  normal: "#64748b",
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.company}</p>
      <p className="text-muted-foreground">
        Funding: <span className="text-foreground font-medium">{formatCompactCurrency(d.funding * 1_000_000)}</span>
      </p>
      <p className="text-muted-foreground">
        Engagement: <span className="text-foreground font-medium">{formatCompactNumber(d.engagement)}</span>
      </p>
      <p className="text-muted-foreground">
        Views: <span className="text-foreground font-medium">{formatCompactNumber(d.views)}</span>
      </p>
      <p className="text-muted-foreground">
        Launch Score: <span className="text-foreground font-medium">{d.launchScore}</span>
      </p>
    </div>
  );
}

// ─── Scatter Plot ──────────────────────────────────────────────────────────────

export function FundingEngagementChart({ launches }: { launches: LaunchRow[] }) {
  const scatterData = toScatterData(launches);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Funding vs. Engagement Quality
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          X = funding, Y = active engagement, bubble size = views
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(SIGNAL_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {key.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>

      {scatterData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          Import launches to plot funding against traction.
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="funding"
            type="number"
            name="Funding"
            tickFormatter={(v) => formatCompactCurrency(Number(v) * 1_000_000)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Funding Raised",
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
            }}
          />
          <YAxis
            dataKey="engagement"
            type="number"
            name="Engagement"
            tickFormatter={(v) => formatCompactNumber(Number(v))}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Active Engagement",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
            }}
          />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={scatterData} isAnimationActive={false}>
            {scatterData.map((entry, index) => (
              <Cell
                key={index}
                fill={SIGNAL_COLORS[entry.signal] ?? "#6366f1"}
                fillOpacity={0.8}
                r={Math.max(6, Math.min(18, Math.log10(entry.views + 10) * 2.6))}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────

export function PlatformBarChart({ launches }: { launches: LaunchRow[] }) {
  const barData = toBarData(launches);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Launch Performance by Platform
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          X vs. LinkedIn engagement per company
        </p>
      </div>

      {barData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          X and LinkedIn metrics appear after import.
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={barData}
          margin={{ top: 4, right: 8, bottom: 4, left: -10 }}
          barCategoryGap="30%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCompactNumber(Number(v))}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              fontSize: 12,
            }}
            cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="xLikes" name="X Likes" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="linkedinLikes" name="LinkedIn Likes" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
