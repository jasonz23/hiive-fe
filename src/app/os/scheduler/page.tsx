'use client';

import { Clock, Link2, Lock } from 'lucide-react';
import { Badge, Spinner } from '@/components/ui';
import { useIntegrations, usePosts } from '@/lib/hooks';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

const CHANNELS = ['LinkedIn', 'X', 'Email'];
const CH_ACCENT: Record<string, string> = {
  LinkedIn: 'from-indigo-500/20 text-indigo-300',
  X: 'from-sky-500/20 text-sky-300',
  Email: 'from-emerald-500/20 text-emerald-300',
};

function when(p: Post): Date {
  return new Date(p.scheduledAt ?? p.publishedAt ?? p.createdAt);
}

export default function SchedulerApp() {
  const { data: posts } = usePosts();
  const { data: integrations } = useIntegrations();
  if (!posts) return <Spinner />;

  const accounts = (integrations ?? []).filter((i) => i.category === 'publishing');
  const accountFor = (platform: string) => accounts.find((a) => a.platform === platform);
  const anyConnected = accounts.some((a) => a.status === 'connected');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Publishing Queue</h1>
        <p className="mt-1 text-sm text-muted">Scheduled content across channels — the agents keep it flowing</p>
      </div>

      {!anyConnected && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
          <Lock size={14} className="text-amber-400" />
          <span className="text-foreground">No publishing accounts connected — posts publish in <span className="font-medium">simulation</span> only.</span>
          <a href="/settings" className="ml-auto rounded-md border border-border px-2 py-1 text-muted hover:text-foreground">Connect accounts in Settings →</a>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {CHANNELS.map((ch) => {
          const queue = posts
            .filter((p) => p.platform === ch)
            .sort((a, b) => when(a).getTime() - when(b).getTime());
          const live = accountFor(ch)?.status === 'connected';
          return (
            <div key={ch} className="rounded-xl border border-border bg-surface">
              <div className={cn('flex items-center justify-between rounded-t-xl bg-gradient-to-b to-transparent px-4 py-3', CH_ACCENT[ch])}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {ch}
                  <span title={live ? 'Account connected' : 'No account connected — simulated'} className={cn('inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium', live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-muted')}>
                    {live ? <Link2 size={9} /> : <Lock size={9} />} {live ? 'live' : 'sim'}
                  </span>
                </span>
                <span className="text-xs text-muted">{queue.length} queued</span>
              </div>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
                {queue.length === 0 && <p className="py-4 text-center text-xs text-muted">Empty queue</p>}
                {queue.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Clock size={11} />
                        {when(p).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {when(p).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge tone={p.status}>{p.status}</Badge>
                    </div>
                    <p className="line-clamp-3 text-xs text-foreground/90">{p.copy.split('\n')[0]}</p>
                    {p.metrics && p.metrics.impressions > 0 && (
                      <p className="mt-1.5 text-[10px] text-muted">{p.metrics.impressions.toLocaleString()} impressions · {p.metrics.ctr}% CTR</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
