'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Card, CardHeader, Empty, PageHeader, ProgressBar, Spinner } from '@/components/ui';
import { AgentLoop, LoopPhase } from '@/components/agent-loop';
import { RunAgentButton } from '@/components/run-agent-button';
import { useAds, useCampaignSummary } from '@/lib/hooks';
import { formatNumber, titleCase } from '@/lib/utils';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate } = useCampaignSummary(id);
  const { data: ads } = useAds(id);

  if (!data) return <Spinner />;
  const { campaign, progress, ai, openRecommendations } = data;

  // Highlight where this campaign currently sits in the agent loop.
  const loopPhase: LoopPhase = openRecommendations.length
    ? 'Recommend'
    : campaign.posts.some((p) => p.metrics && p.metrics.impressions > 0)
      ? 'Analyze'
      : campaign.posts.length
        ? 'Track'
        : 'Generate';

  return (
    <div>
      <PageHeader
        title={campaign.name}
        subtitle={campaign.objective}
        action={
          <div className="flex gap-2">
            <RunAgentButton agentType="ContentGenerationAgent" input={{ campaignId: id, count: 3 }} label="Generate posts" onDone={() => mutate()} />
            <RunAgentButton agentType="PerformanceMonitoringAgent" input={{ campaignId: id }} label="Analyze" onDone={() => mutate()} />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={campaign.status}>{campaign.status}</Badge>
        <Badge tone={campaign.health}>{campaign.health}</Badge>
        <span className="text-sm text-muted">Audience: {campaign.audience}</span>
        <span className="text-sm text-muted">· ${formatNumber(campaign.budget)} budget</span>
      </div>

      <Card className="mb-6 p-4">
        <p className="mb-2 text-xs font-medium text-muted">Agent loop — current phase highlighted</p>
        <AgentLoop active={loopPhase} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Goal progress" subtitle={`${progress.overallPct}% overall · ${titleCase(progress.health)}`} />
            <div className="space-y-4 p-5">
              {Object.entries(progress.attainment).map(([metric, a]) => (
                <div key={metric}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize text-muted">{metric}</span>
                    <span className="text-foreground">{formatNumber(a.actual)} / {formatNumber(a.goal)} ({a.pct}%)</span>
                  </div>
                  <ProgressBar pct={a.pct} />
                </div>
              ))}
              {Object.keys(progress.attainment).length === 0 && <Empty>No goals set</Empty>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Posts" subtitle={`${campaign.posts.length} in calendar`} />
            <div className="divide-y divide-border">
              {campaign.posts.length === 0 && <div className="p-5"><Empty>No posts yet</Empty></div>}
              {campaign.posts.map((p) => (
                <Link key={p.id} href={`/posts/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.copy.split('\n')[0]}</p>
                    <p className="text-xs text-muted">{p.platform}{p.metrics?.impressions ? ` · ${formatNumber(p.metrics.impressions)} impressions · ${p.metrics.ctr}% CTR` : ''}</p>
                  </div>
                  <Badge tone={p.status}>{p.status}</Badge>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Ads" subtitle={`${ads?.length ?? 0} ads`} action={ads?.length ? <RunAgentButton agentType="AdsOptimizationAgent" input={{ campaignId: id }} label="Optimize" onDone={() => mutate()} /> : undefined} />
            <div className="overflow-x-auto">
              {(!ads || ads.length === 0) ? (
                <div className="p-5"><Empty>No ads</Empty></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 font-medium">Ad</th>
                      <th className="px-3 py-2 font-medium">CTR</th>
                      <th className="px-3 py-2 font-medium">CPC</th>
                      <th className="px-3 py-2 font-medium">CPA</th>
                      <th className="px-5 py-2 font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.map((ad) => (
                      <tr key={ad.id} className="border-b border-border/50">
                        <td className="px-5 py-2">{ad.name} <span className="text-muted">· {ad.platform}</span></td>
                        <td className="px-3 py-2">{ad.derived.ctr}%</td>
                        <td className="px-3 py-2">${ad.derived.cpc}</td>
                        <td className="px-3 py-2">${ad.derived.cpa}</td>
                        <td className="px-5 py-2">${formatNumber(ad.spend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="AI summary" />
            <div className="space-y-3 p-5 text-sm">
              <p className="text-muted">{ai.summary}</p>
              {ai.highlights?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-emerald-400">Highlights</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">{ai.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </div>
              )}
              {ai.risks?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-400">Risks</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">{ai.risks.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </div>
              )}
              {ai.nextActions?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-primary">Next actions</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">{ai.nextActions.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recommendations" />
            <div className="divide-y divide-border">
              {openRecommendations.length === 0 && <div className="p-5"><Empty>None open</Empty></div>}
              {openRecommendations.map((r) => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <Badge tone={r.severity === 'info' ? 'published' : r.severity}>{r.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
