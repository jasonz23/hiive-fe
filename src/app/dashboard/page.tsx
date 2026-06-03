'use client';

import Link from 'next/link';
import { AutonomousPanel } from '@/components/autonomous-panel';
import { Badge, Card, CardHeader, Empty, PageHeader, Spinner, Stat } from '@/components/ui';
import {
  useApprovals,
  useCampaigns,
  useIntegrations,
  usePosts,
  useRecommendations,
} from '@/lib/hooks';
import { timeAgo } from '@/lib/utils';

const SEV_TONE: Record<string, string> = {
  critical: 'critical',
  warning: 'warning',
  opportunity: 'opportunity',
  info: 'published',
};

export default function DashboardPage() {
  const { data: campaigns } = useCampaigns();
  const { data: approvals } = useApprovals('pending');
  const { data: recs } = useRecommendations();
  const { data: posts } = usePosts();
  const { data: integrations } = useIntegrations();

  if (!campaigns || !posts) return <Spinner />;

  const connected = (integrations ?? []).filter((i) => i.status === 'connected');

  const active = campaigns.filter((c) => c.status === 'active');
  const unhealthy = campaigns.filter((c) => c.health === 'at_risk' || c.health === 'critical' || c.health === 'warning');
  const topPosts = [...posts]
    .filter((p) => p.metrics && p.metrics.impressions > 0)
    .sort((a, b) => (b.metrics?.ctr ?? 0) - (a.metrics?.ctr ?? 0))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your AI marketing team works autonomously — you step in only to approve"
      />

      <div className="mb-6">
        <AutonomousPanel />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active campaigns" value={active.length} />
        <Stat
          label="Need attention"
          value={unhealthy.length}
          tone={unhealthy.length ? 'text-amber-400' : undefined}
        />
        <Stat
          label="Pending approvals"
          value={approvals?.length ?? 0}
          tone={(approvals?.length ?? 0) > 0 ? 'text-amber-400' : undefined}
        />
        <Stat
          label="Integrations connected"
          value={connected.length}
          sub={connected.length ? connected.map((c) => c.label).join(', ') : 'none'}
        />
        <Stat label="Open recommendations" value={recs?.length ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Campaigns needing attention" subtitle="Below-target health" />
          <div className="divide-y divide-border">
            {unhealthy.length === 0 && (
              <div className="p-5"><Empty>All campaigns healthy 🎉</Empty></div>
            )}
            {unhealthy.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.objective}</p>
                </div>
                <Badge tone={c.health}>{c.health}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent agent recommendations" />
          <div className="divide-y divide-border">
            {(!recs || recs.length === 0) && <div className="p-5"><Empty>No recommendations yet</Empty></div>}
            {recs?.slice(0, 5).map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.title}</p>
                  <Badge tone={SEV_TONE[r.severity]}>{r.severity}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{r.body}</p>
                <p className="mt-1 text-[11px] text-muted">{r.agentType} · {timeAgo(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pending approvals" subtitle="Human-in-the-loop gates" />
          <div className="divide-y divide-border">
            {(!approvals || approvals.length === 0) && <div className="p-5"><Empty>Nothing awaiting approval</Empty></div>}
            {approvals?.slice(0, 5).map((a) => (
              <Link key={a.id} href="/calendar" className="flex items-center justify-between px-5 py-3 hover:bg-surface-2">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted">{a.agentRun?.agentType ?? a.type}</p>
                </div>
                <Badge tone="pending">{a.type}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top-performing posts" subtitle="By click-through rate" />
          <div className="divide-y divide-border">
            {topPosts.length === 0 && <div className="p-5"><Empty>No published posts yet</Empty></div>}
            {topPosts.map((p) => (
              <Link key={p.id} href={`/posts/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.copy.split('\n')[0]}</p>
                  <p className="text-xs text-muted">{p.platform} · {p.metrics?.impressions.toLocaleString()} impressions</p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold text-emerald-400">{p.metrics?.ctr}%</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
