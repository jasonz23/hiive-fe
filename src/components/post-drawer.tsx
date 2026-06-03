'use client';

import { CheckCircle2, ExternalLink, Send, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Badge, Button, Card, CardHeader, Empty } from '@/components/ui';
import { ApprovalCard } from '@/components/approval-card';
import { AudiencePanel } from '@/components/audience-panel';
import { LifecycleStepper } from '@/components/lifecycle-stepper';
import { PostDoc } from '@/components/post-doc';
import { apiPatch, apiPost } from '@/lib/api';
import { useApprovals, usePost } from '@/lib/hooks';
import type { Campaign, Post, PostStatus } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

type Persona = { persona: string; score: number; reaction: string; strengths: string[]; risks: string[] };

const PLATFORMS = ['LinkedIn', 'X', 'Email'];
const STATUSES: PostStatus[] = [
  'draft', 'review', 'approved', 'scheduled', 'published', 'analyzing', 'underperforming', 'completed',
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostDrawer({
  post,
  createDate,
  campaigns,
  onClose,
  onSaved,
}: {
  post: Post | null;
  createDate: string | null;
  campaigns: Campaign[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Initialized directly from props; the parent passes a `key` so this remounts
  // (with fresh initial state) whenever the selected post / create-date changes.
  const isCreate = !post;
  const [copy, setCopy] = useState(post?.copy ?? '');
  const [platform, setPlatform] = useState(post?.platform ?? 'LinkedIn');
  const [status, setStatus] = useState<PostStatus>(post?.status ?? 'draft');
  const [scheduledAt, setScheduledAt] = useState(
    post ? toLocalInput(post.scheduledAt) : createDate ? `${createDate}T09:00` : '',
  );
  const [campaignId, setCampaignId] = useState(post?.campaignId ?? campaigns[0]?.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();
  const { data: pendingApprovals, mutate: mutateApprovals } = useApprovals('pending');
  // Full post (metrics, simulation, analysis, recommendations) — same data the
  // dedicated post page shows; the calendar list item only carries a subset.
  const { data: full, mutate: mutateFull } = usePost(isCreate ? undefined : post!.id);
  const view = full ?? post;
  const postApprovals = (pendingApprovals ?? []).filter((a) => post && a.entityId === post.id);
  const isLive = ['published', 'analyzing', 'underperforming', 'completed'].includes(status);
  const isApproved = status === 'approved' || status === 'scheduled';

  const m = view?.metrics ?? null;
  const sim = view?.simulation as
    | { overallScore: number; personas: Persona[]; strengths: string[]; risks: string[]; suggestedRevision: string }
    | null;
  const analysis = view?.aiAnalysis as
    | { issue?: string; likelyCause?: string; recommendedActions?: string[]; rewrittenCta?: string }
    | null;
  const recommendations = (full?.recommendations ?? []) as { id: string; title: string; body: string; severity: string }[];

  async function save() {
    setBusy('save');
    try {
      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      if (isCreate) {
        await apiPost('/posts', { campaignId, platform, copy, status, scheduledAt: scheduledIso });
      } else {
        // Copy is edited through the PostDoc agent doc, so Save only touches
        // scheduling/platform/status here and never clobbers in-flight copy edits.
        await apiPatch(`/posts/${post!.id}`, { platform, status, scheduledAt: scheduledIso });
      }
      onSaved();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function agentAction(path: string, key: string) {
    if (!post) return;
    setBusy(key);
    try {
      // The action endpoints return the updated post — reflect its new status in
      // the drawer immediately (the drawer is keyed by id, so it won't remount).
      const updated = await apiPost<Post>(`/posts/${post.id}${path}`, {});
      if (updated?.status) setStatus(updated.status);
      onSaved();
      // Surface the agent loop's results — status, metrics, approvals it may
      // raise, AND comments (e.g. the pre-publish review left on approval).
      const revalidate = () =>
        Promise.all([
          mutateApprovals(),
          mutateFull(),
          globalMutate(
            (k) =>
              Array.isArray(k) &&
              typeof k[0] === 'string' &&
              k[0].includes(`/posts/${post.id}/comments`),
          ),
        ]);
      await revalidate();
      setTimeout(() => void revalidate(), 1200);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">{isCreate ? 'New post' : 'Edit post'}</h3>
            {!isCreate && <p className="text-xs text-muted">{post!.campaign?.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!isCreate && (
              <Link href={`/posts/${post!.id}`} className="text-muted hover:text-foreground" title="Open full page">
                <ExternalLink size={16} />
              </Link>
            )}
            <button onClick={onClose} className="text-muted hover:text-foreground"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!isCreate && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="mb-3 text-xs font-medium text-muted">Agent lifecycle</p>
              <LifecycleStepper status={status} />
            </div>
          )}

          {isCreate && (
            <Field label="Campaign">
              <select className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Scheduled date">
            <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>

          {isCreate ? (
            <Field label="Copy">
              <textarea className="input h-40 resize-y" value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Post copy…" />
            </Field>
          ) : (
            // Same agent doc as the post page — copy + agent comments/suggestions.
            view && <PostDoc post={view} onChanged={() => { onSaved(); void mutateFull(); }} />
          )}

          {!isCreate && m && (
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <Mini label="Impr." value={formatNumber(m.impressions)} />
              <Mini label="Clicks" value={formatNumber(m.clicks)} />
              <Mini label="CTR" value={`${m.ctr}%`} />
              <Mini label="Conv." value={formatNumber(m.conversions)} />
              <Mini label="Likes" value={formatNumber(m.likes)} />
              <Mini label="Comments" value={formatNumber(m.comments)} />
              <Mini label="Shares" value={formatNumber(m.shares)} />
            </div>
          )}

          {!isCreate && sim && (
            <Card>
              <CardHeader title="Swarm simulation" subtitle={`Overall ${sim.overallScore}/100`} />
              <div className="space-y-2 p-4">
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

          {!isCreate && <AudiencePanel postId={post!.id} />}

          {!isCreate && (
            <Card>
              <CardHeader title="AI analysis" />
              <div className="p-4">
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
                  <Empty>Performance analysis appears here once the agent runs.</Empty>
                )}
              </div>
            </Card>
          )}

          {!isCreate && recommendations.length > 0 && (
            <Card>
              <CardHeader title="Recommendations" />
              <div className="divide-y divide-border">
                {recommendations.map((r) => (
                  <div key={r.id} className="px-4 py-3">
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

          {!isCreate && (
            isLive ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" /> Live · the autonomous engine pulls metrics &amp; runs agents
              </div>
            ) : isApproved ? (
              <div>
                <Button size="sm" disabled={busy !== null} onClick={() => agentAction('/publish', 'publish')}>
                  <Send size={13} /> {busy === 'publish' ? 'Publishing…' : 'Publish'}
                </Button>
                <p className="mt-1.5 text-[11px] text-muted">Approved. Publishing simulates going live; metrics are then pulled and analyzed automatically.</p>
              </div>
            ) : (
              <div>
                <Button size="sm" disabled={busy !== null} onClick={() => agentAction('/approve', 'approve')}>
                  <CheckCircle2 size={13} /> {busy === 'approve' ? 'Approving…' : 'Approve'}
                </Button>
                <p className="mt-1.5 text-[11px] text-muted">Next step: approve this {status} post — then you can publish it.</p>
              </div>
            )
          )}

          {!isCreate && postApprovals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-amber-400">Pending approval{postApprovals.length > 1 ? 's' : ''}</p>
              <div className="space-y-2">
                {postApprovals.map((a) => (
                  <ApprovalCard key={a.id} approval={a} onChange={() => { mutateApprovals(); onSaved(); }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          {!isCreate ? <Badge tone={status}>{status}</Badge> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={busy !== null || (isCreate && !copy)} onClick={save}>
              {busy === 'save' ? 'Saving…' : isCreate ? 'Create post' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2">
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
