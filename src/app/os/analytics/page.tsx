'use client';

import { ArrowUpRight, MousePointerClick, Target, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useAds, useCampaigns, usePosts } from '@/lib/hooks';
import { cn, formatNumber } from '@/lib/utils';

const CH_COLOR: Record<string, string> = {
  LinkedIn: 'bg-indigo-500',
  X: 'bg-sky-500',
  Email: 'bg-emerald-500',
};

export default function AnalyticsApp() {
  const { data: posts } = usePosts();
  const { data: ads } = useAds();
  const { data: campaigns } = useCampaigns();
  if (!posts || !ads) return <Spinner />;

  let impressions = 0, clicks = 0, conversions = 0;
  const channels = new Map<string, { impressions: number; clicks: number }>();
  for (const p of posts) {
    const m = p.metrics;
    if (!m) continue;
    impressions += m.impressions; clicks += m.clicks; conversions += m.conversions;
    const c = channels.get(p.platform) ?? { impressions: 0, clicks: 0 };
    c.impressions += m.impressions; c.clicks += m.clicks;
    channels.set(p.platform, c);
  }
  for (const a of ads) { impressions += a.impressions; clicks += a.clicks; conversions += a.conversions; }
  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const maxImpr = Math.max(1, ...[...channels.values()].map((c) => c.impressions));
  const topPosts = [...posts].filter((p) => p.metrics && p.metrics.impressions > 0).sort((a, b) => (b.metrics!.ctr) - (a.metrics!.ctr)).slice(0, 8);

  // Real deltas: compare current totals to the prior captured snapshot, summed
  // over posts whose metricsHistory carries at least two points.
  let prevImpr = 0, currImpr = 0, prevClicks = 0, currClicks = 0, prevConv = 0, currConv = 0;
  for (const p of posts) {
    const h = p.metricsHistory ?? [];
    if (h.length < 2) continue;
    const prev = h[h.length - 2];
    const curr = h[h.length - 1];
    prevImpr += prev.impressions; currImpr += curr.impressions;
    prevClicks += prev.clicks; currClicks += curr.clicks;
    prevConv += prev.conversions; currConv += curr.conversions;
  }
  const prevCtr = prevImpr ? (prevClicks / prevImpr) * 100 : 0;
  const currCtr = currImpr ? (currClicks / currImpr) * 100 : 0;
  const hasTrend = prevImpr > 0 || currImpr > 0;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Cross-channel performance overview</p>
        </div>
        <span className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted">Since last refresh</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={TrendingUp} label="Impressions" value={formatNumber(impressions)} delta={hasTrend ? pctDelta(prevImpr, currImpr) : null} />
        <Kpi icon={MousePointerClick} label="Clicks" value={formatNumber(clicks)} delta={hasTrend ? pctDelta(prevClicks, currClicks) : null} />
        <Kpi icon={ArrowUpRight} label="Avg CTR" value={`${ctr.toFixed(2)}%`} delta={hasTrend ? ppDelta(prevCtr, currCtr) : null} />
        <Kpi icon={Target} label="Conversions" value={formatNumber(conversions)} delta={hasTrend ? pctDelta(prevConv, currConv) : null} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold">Channel performance</h3>
          <div className="space-y-3">
            {[...channels.entries()].map(([ch, c]) => {
              const chCtr = c.impressions ? (c.clicks / c.impressions) * 100 : 0;
              return (
                <div key={ch}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-foreground">{ch}</span>
                    <span className="text-muted">{formatNumber(c.impressions)} impr · {chCtr.toFixed(2)}% CTR</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div className={cn('h-full rounded-full', CH_COLOR[ch] ?? 'bg-slate-500')} style={{ width: `${(c.impressions / maxImpr) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold">Campaign goal attainment</h3>
          <div className="space-y-3">
            {(campaigns ?? []).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{c.name}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px]', c.health === 'healthy' ? 'bg-emerald-500/15 text-emerald-400' : c.health === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400')}>{c.health}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border"><th className="px-5 py-3">Top content</th><th className="px-3 py-3">Platform</th><th className="px-3 py-3">Impr.</th><th className="px-5 py-3">CTR</th></tr>
          </thead>
          <tbody>
            {topPosts.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="max-w-xs truncate px-5 py-2.5">{p.copy.split('\n')[0]}</td>
                <td className="px-3 py-2.5 text-muted">{p.platform}</td>
                <td className="px-3 py-2.5">{formatNumber(p.metrics!.impressions)}</td>
                <td className="px-5 py-2.5 font-medium text-emerald-400">{p.metrics!.ctr}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Percentage delta between two totals, signed; "—" when there's no baseline. */
function pctDelta(prev: number, curr: number): string {
  if (prev <= 0) return curr > 0 ? 'new' : '—';
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
}

/** Percentage-point delta (for rates like CTR), signed. */
function ppDelta(prev: number, curr: number): string {
  const d = curr - prev;
  return `${d >= 0 ? '+' : ''}${d.toFixed(2)}pp`;
}

function Kpi({ icon: Icon, label, value, delta }: { icon: typeof TrendingUp; label: string; value: string; delta: string | null }) {
  const negative = delta != null && delta.startsWith('-');
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><Icon size={15} /></span>
        {delta != null && <span className={cn('text-[11px]', negative ? 'text-red-400' : 'text-emerald-400')}>{delta}</span>}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
