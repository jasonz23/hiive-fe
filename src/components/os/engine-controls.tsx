'use client';

import { Activity, HeartPulse, Power } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useAutonomousStatus } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * Engine controls on the OS desktop background — two independent switches that
 * gate the agent runtime. `Autonomous` drives the reactive metric loop + actions
 * (and the hourly monitor); `Heartbeat` drives the loop that exercises the whole
 * agent roster. When both are off, no agent runs and zero LLM calls are made.
 */
export function EngineControls() {
  const { data: status, mutate } = useAutonomousStatus();
  if (!status) return null;

  const allOff = !status.enabled && !status.heartbeatEnabled;

  async function set(path: string, enabled: boolean) {
    await apiPost(path, { enabled });
    mutate();
  }
  async function setAll(enabled: boolean) {
    await Promise.all([
      apiPost('/autonomous/toggle', { enabled }),
      apiPost('/autonomous/heartbeat-toggle', { enabled }),
    ]);
    mutate();
  }

  return (
    <div className="mb-2 rounded-xl border border-white/10 bg-black/30 p-2.5 backdrop-blur-md">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
          <Power size={12} /> Engine
        </span>
        <button
          onClick={() => setAll(allOff)}
          className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-muted hover:text-foreground"
        >
          {allOff ? 'Turn all on' : 'Turn all off'}
        </button>
      </div>

      <ToggleRow
        icon={Activity}
        label="Autonomous"
        desc="metric loop + actions"
        on={status.enabled}
        onToggle={(v) => set('/autonomous/toggle', v)}
      />
      <ToggleRow
        icon={HeartPulse}
        label="Heartbeat"
        desc="exercises every agent"
        on={status.heartbeatEnabled}
        onToggle={(v) => set('/autonomous/heartbeat-toggle', v)}
      />

      <p className={cn('mt-1.5 text-[10px]', allOff ? 'text-slate-400' : 'text-emerald-400/80')}>
        {allOff ? 'All agents off — no LLM calls.' : `Running · ${status.tickCount} ticks`}
      </p>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  on,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  on: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon size={13} className={on ? 'text-emerald-400' : 'text-muted'} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-tight text-foreground">{label}</p>
        <p className="text-[9px] leading-tight text-muted">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={`Toggle ${label}`}
        onClick={() => onToggle(!on)}
        className={cn('relative h-4 w-7 shrink-0 rounded-full transition', on ? 'bg-emerald-500/70' : 'bg-white/15')}
      >
        <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all', on ? 'left-3.5' : 'left-0.5')} />
      </button>
    </div>
  );
}
