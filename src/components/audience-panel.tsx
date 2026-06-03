'use client';

import { MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { Badge, Card, CardHeader, Empty } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useAudience } from '@/lib/hooks';
import { cn, timeAgo } from '@/lib/utils';

const TONE: Record<string, string> = { positive: 'active', neutral: '', negative: 'critical' };

/** Audience/social comments pulled on a post + the engagement agent's summary. */
export function AudiencePanel({ postId }: { postId: string }) {
  const { data, mutate } = useAudience(postId);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return null;

  const replyOptions = data.summary?.replyOptions ?? [];

  async function reply(commentId: string, text: string) {
    setBusy(commentId);
    try {
      await apiPost(`/posts/${postId}/audience/${commentId}/reply`, { text });
      await mutate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5"><MessageCircle size={15} /> Audience</span>}
        subtitle={data.summary?.summary ?? 'Pulled automatically alongside metrics'}
      />
      <div className="space-y-3 p-5">
        {data.quality && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px]">
            <p className="text-foreground">
              <span className="font-medium text-primary">Qualified engagement {data.quality.qualifiedScore}</span> —{' '}
              {data.quality.qualifiedCount}/{data.quality.totalCount} comments from on-segment ({data.quality.segment.replace('_', '-')}) prospects.
            </p>
            {data.quality.topProfiles.length > 0 && (
              <p className="mt-0.5 text-muted">Engaging: {data.quality.topProfiles.join(', ')}.</p>
            )}
          </div>
        )}
        {data.summary && (
          <div className="flex flex-wrap items-center gap-1.5">
            {data.summary.sentiment && <Badge tone={TONE[data.summary.sentiment] ?? ''}>{data.summary.sentiment}</Badge>}
            {(data.summary.themes ?? []).slice(0, 4).map((t, i) => <Badge key={`${t}-${i}`}>{t}</Badge>)}
          </div>
        )}
        {data.comments.length === 0 && <Empty>No audience comments yet — they’re pulled automatically as the post runs.</Empty>}
        {data.comments.map((c) => (
          <div key={c.id} className={cn('rounded-lg border bg-surface-2 p-3', c.onSegment ? 'border-emerald-500/30' : 'border-border')}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-xs font-medium text-foreground">{c.author}</span>
                {c.profile && (
                  <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px]', c.onSegment ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-muted')}>
                    {c.profile}{c.weight != null ? ` · ${Math.round(c.weight * 100)}%` : ''}
                  </span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge tone={TONE[c.sentiment] ?? ''}>{c.sentiment}</Badge>
                <span className="text-[10px] text-muted">{timeAgo(c.createdAt)}</span>
              </div>
            </div>
            <p className="text-xs text-muted">{c.text}</p>
            {c.status === 'replied' ? (
              <p className="mt-1.5 rounded bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-300">↩ {c.reply}</p>
            ) : (
              replyOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {replyOptions.map((r, i) => (
                    <button
                      key={`${r.label}-${i}`}
                      disabled={busy !== null}
                      onClick={() => reply(c.id, r.text)}
                      title={r.text}
                      className={cn('inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted hover:text-foreground disabled:opacity-50')}
                    >
                      <Send size={11} /> {r.label}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
