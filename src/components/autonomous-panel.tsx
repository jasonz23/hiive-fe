'use client';

import { Activity, Pause, Play, Zap } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useAutonomousActivity, useAutonomousStatus } from '@/lib/hooks';
import { cn, timeAgo } from '@/lib/utils';

/**
 * Live view of the autonomous engine: shows it's running on its own, what it just
 * did, and lets you pause/resume or fast-forward a tick for demos.
 */
export function AutonomousPanel() {
  const { data: status, mutate: mutateStatus } = useAutonomousStatus();
  const { data: activity, mutate: mutateActivity } = useAutonomousActivity();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!status) return;
    setBusy(true);
    try {
      await apiPost('/autonomous/toggle', { enabled: !status.enabled });
      await mutateStatus();
    } finally {
      setBusy(false);
    }
  }

  async function runTick() {
    setBusy(true);
    try {
      await apiPost('/autonomous/tick', {});
      await Promise.all([mutateStatus(), mutateActivity()]);
    } finally {
      setBusy(false);
    }
  }

  const enabled = status?.enabled ?? false;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={cn('relative flex h-2.5 w-2.5')}>
            <span className={cn('absolute inline-flex h-full w-full rounded-full', enabled ? 'animate-ping bg-emerald-400/60' : 'bg-transparent')} />
            <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', enabled ? 'bg-emerald-400' : 'bg-muted')} />
          </span>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Activity size={15} /> Autonomous engine {enabled ? 'running' : 'paused'}
            </h3>
            <p className="text-xs text-muted">
              {status
                ? `Pulls mock metrics + runs agents every ${status.cadenceSeconds}s · ${status.tickCount} ticks · stops at the human approval queue`
                : '…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runTick} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50">
            <Zap size={13} /> Run tick
          </button>
          <button onClick={toggle} disabled={busy} className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs', enabled ? 'border border-border text-muted hover:text-foreground' : 'bg-primary text-primary-fg')}>
            {enabled ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
          </button>
        </div>
      </div>
      <div className="max-h-44 overflow-y-auto px-5 py-3">
        {(!activity || activity.length === 0) ? (
          <p className="py-2 text-xs text-muted">Waiting for the next tick…</p>
        ) : (
          <ul className="space-y-1.5">
            {activity.slice(0, 12).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                <span className="text-foreground/90">{a.message}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
