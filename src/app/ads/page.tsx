'use client';

import { useState } from 'react';
import { Badge, Card, Empty, PageHeader, Spinner } from '@/components/ui';
import { useAds } from '@/lib/hooks';
import type { AdCampaign } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

const PLATFORM_COLOR: Record<string, string> = {
  LinkedIn: 'bg-indigo-500',
  X: 'bg-sky-500',
  Email: 'bg-emerald-500',
};

export default function AdsPage() {
  const { data: ads } = useAds();
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  if (!ads) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Ads"
        subtitle="Flight schedule and performance across channels"
        action={
          <div className="flex rounded-lg border border-border p-0.5">
            {(['timeline', 'table'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('rounded-md px-3 py-1 text-sm capitalize transition', view === v ? 'bg-surface-2 text-foreground' : 'text-muted')}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />
      {ads.length === 0 ? <Empty>No ads yet.</Empty> : view === 'timeline' ? <Timeline ads={ads} /> : <Table ads={ads} />}
    </div>
  );
}

function Timeline({ ads }: { ads: AdCampaign[] }) {
  // Window spanning all flights (fallback to current month).
  const dated = ads.filter((a) => a.startDate && a.endDate);
  const starts = dated.map((a) => new Date(a.startDate!).getTime());
  const ends = dated.map((a) => new Date(a.endDate!).getTime());
  const now = new Date();
  const min = starts.length ? new Date(Math.min(...starts)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const max = ends.length ? new Date(Math.max(...ends)) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const span = Math.max(1, max.getTime() - min.getTime());
  const pct = (t: number) => ((t - min.getTime()) / span) * 100;

  // Week ticks across the window.
  const ticks: { label: string; left: number }[] = [];
  const cur = new Date(min);
  cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= max.getTime()) {
    ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, left: pct(cur.getTime()) });
    cur.setDate(cur.getDate() + 7);
  }

  return (
    <Card className="p-5">
      <div className="relative mb-3 ml-44 h-4 border-b border-border">
        {ticks.map((t, i) => (
          <span key={i} className="absolute -translate-x-1/2 text-[10px] text-muted" style={{ left: `${t.left}%` }}>{t.label}</span>
        ))}
      </div>
      <div className="space-y-2.5">
        {ads.map((ad) => {
          const hasDates = ad.startDate && ad.endDate;
          const left = hasDates ? pct(new Date(ad.startDate!).getTime()) : 0;
          const width = hasDates ? Math.max(2, pct(new Date(ad.endDate!).getTime()) - left) : 100;
          return (
            <div key={ad.id} className="flex items-center gap-3">
              <div className="w-44 shrink-0">
                <p className="truncate text-xs font-medium">{ad.name}</p>
                <p className="text-[10px] text-muted">{ad.platform} · {ad.derived.ctr}% CTR</p>
              </div>
              <div className="relative h-7 flex-1 rounded bg-surface-2">
                <div
                  className={cn('absolute top-0 flex h-7 items-center gap-2 rounded px-2 text-[10px] text-white', PLATFORM_COLOR[ad.platform] ?? 'bg-slate-500', ad.status !== 'active' && 'opacity-60')}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${ad.startDate?.slice(0, 10)} → ${ad.endDate?.slice(0, 10)}`}
                >
                  <span className="truncate">${formatNumber(ad.spend)} / ${formatNumber(ad.budget)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-muted">
        {Object.entries(PLATFORM_COLOR).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded', c)} /> {p}</span>
        ))}
      </div>
    </Card>
  );
}

function Table({ ads }: { ads: AdCampaign[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-border">
            <th className="px-5 py-3 font-medium">Ad</th>
            <th className="px-3 py-3 font-medium">Platform</th>
            <th className="px-3 py-3 font-medium">Flight</th>
            <th className="px-3 py-3 font-medium">CTR</th>
            <th className="px-3 py-3 font-medium">CPC</th>
            <th className="px-3 py-3 font-medium">CPA</th>
            <th className="px-3 py-3 font-medium">Spend</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id} className="border-b border-border/50 hover:bg-surface-2">
              <td className="px-5 py-3 font-medium">{ad.name}</td>
              <td className="px-3 py-3 text-muted">{ad.platform}</td>
              <td className="px-3 py-3 text-muted">{ad.startDate?.slice(5, 10)} – {ad.endDate?.slice(5, 10)}</td>
              <td className="px-3 py-3">{ad.derived.ctr}%</td>
              <td className="px-3 py-3">${ad.derived.cpc}</td>
              <td className="px-3 py-3">${ad.derived.cpa}</td>
              <td className="px-3 py-3">${formatNumber(ad.spend)}</td>
              <td className="px-5 py-3"><Badge tone={ad.status}>{ad.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
