'use client';

import { Send } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Spinner, Stat } from '@/components/ui';
import { AudiencePanel } from '@/components/audience-panel';
import { LifecycleStepper } from '@/components/lifecycle-stepper';
import { PostDoc } from '@/components/post-doc';
import { apiPost } from '@/lib/api';
import { usePost } from '@/lib/hooks';
import { formatNumber } from '@/lib/utils';

type Persona = { persona: string; score: number; reaction: string; strengths: string[]; risks: string[] };

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, mutate } = usePost(id);
  const { mutate: globalMutate } = useSWRConfig();
  const [busy, setBusy] = useState<string | null>(null);

  // Revalidate the post + its comments + recommendations (any key mentioning this post).
  const revalidatePost = () =>
    globalMutate((key) => typeof key === 'string' && key.includes(`/posts/${id}`));

  async function act(path: string, key: string) {
    setBusy(key);
    try {
      await apiPost(`/posts/${id}${path}`, {});
      await revalidatePost();
      // Catch the agent loop's async tail (comments/approvals it may add).
      setTimeout(() => void revalidatePost(), 1200);
    } finally {
      setBusy(null);
    }
  }

  if (!post) return <Spinner />;
  const m = post.metrics;
  const sim = post.simulation as
    | { overallScore: number; personas: Persona[]; strengths: string[]; risks: string[]; suggestedRevision: string }
    | null;
  const analysis = post.aiAnalysis as
    | { issue?: string; likelyCause?: string; recommendedActions?: string[]; rewrittenCta?: string }
    | null;

  const isLive = ['published', 'analyzing', 'underperforming', 'completed'].includes(post.status);

  return (
    <div>
      <PageHeader
        title={`${post.platform} post`}
        subtitle={post.campaign?.name}
        action={
          isLive ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" /> Live · monitored autonomously
            </span>
          ) : (
            <Button size="sm" disabled={busy !== null} onClick={() => act('/publish', 'publish')}>
              <Send size={14} /> {busy === 'publish' ? 'Publishing…' : 'Publish'}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={post.status}>{post.status}</Badge>
        {post.approvalStatus && <Badge tone={post.approvalStatus}>{post.approvalStatus}</Badge>}
      </div>

      <Card className="mb-6">
        <CardHeader title="Agent lifecycle" subtitle="Where this post sits in the generate → simulate → approve → monitor → learn loop" />
        <div className="px-5 pb-5 pt-4">
          <LifecycleStepper status={post.status} />
        </div>
      </Card>

      <div className="mb-6">
        <PostDoc post={post} onChanged={() => mutate()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {m && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Impressions" value={formatNumber(m.impressions)} />
              <Stat label="Clicks" value={formatNumber(m.clicks)} />
              <Stat label="CTR" value={`${m.ctr}%`} tone={m.ctr >= 2 ? 'text-emerald-400' : 'text-amber-400'} />
              <Stat label="Conversions" value={formatNumber(m.conversions)} />
              <Stat label="Likes" value={formatNumber(m.likes)} />
              <Stat label="Comments" value={formatNumber(m.comments)} />
              <Stat label="Shares" value={formatNumber(m.shares)} />
            </div>
          )}

          {sim && (
            <Card>
              <CardHeader title="Swarm simulation" subtitle={`Overall ${sim.overallScore}/100`} />
              <div className="space-y-2 p-5">
                {sim.personas?.map((p) => (
                  <div key={p.persona} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{p.persona}</p>
                      <span className={`text-sm font-semibold ${p.score >= 75 ? 'text-emerald-400' : p.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{p.score}/100</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{p.reaction}</p>
                  </div>
                ))}
                {sim.suggestedRevision && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-primary">Suggested revision</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{sim.suggestedRevision}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <AudiencePanel postId={post.id} />

          <Card>
            <CardHeader title="AI analysis" />
            <div className="p-5">
              {analysis?.issue ? (
                <div className="space-y-2 text-sm">
                  <p className="text-foreground">{analysis.issue}</p>
                  {analysis.likelyCause && <p className="text-xs text-muted"><span className="font-medium text-amber-400">Likely cause:</span> {analysis.likelyCause}</p>}
                  {analysis.recommendedActions && (
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">
                      {analysis.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
                </div>
              ) : (
                <Empty>Performance analysis appears here automatically once the post is monitored.</Empty>
              )}
            </div>
          </Card>

          {post.recommendations?.length > 0 && (
            <Card>
              <CardHeader title="Recommendations" />
              <div className="divide-y divide-border">
                {post.recommendations.map((r) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
