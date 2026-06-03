'use client';

import Link from 'next/link';
import { Badge, Card, Empty, PageHeader, ProgressBar, Spinner } from '@/components/ui';
import { useCampaigns } from '@/lib/hooks';
import { formatNumber } from '@/lib/utils';

export default function CampaignsPage() {
  const { data: campaigns } = useCampaigns();
  if (!campaigns) return <Spinner />;

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Goals, channels, and live health" />
      {campaigns.length === 0 ? (
        <Empty>No campaigns yet. Run a mission to create one.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const leads = c.goals?.leads ?? 0;
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="h-full p-5 transition hover:border-primary/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="mt-0.5 text-sm text-muted">{c.objective}</p>
                    </div>
                    <Badge tone={c.health}>{c.health}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.channels.map((ch) => (
                      <span key={ch} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        {ch}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{c._count?.posts ?? 0} posts · {c._count?.ads ?? 0} ads</span>
                    <span>{leads ? `${formatNumber(leads)} lead goal` : ''}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar pct={0} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone={c.status}>{c.status}</Badge>
                    <span className="text-xs text-muted">${formatNumber(c.budget)} budget</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
