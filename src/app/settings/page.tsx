'use client';

import { Activity, Download, ExternalLink, HeartPulse, Lock, Plug, Power, RefreshCw, Send, Webhook } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader, PageHeader, Spinner } from '@/components/ui';
import { API_BASE, ApiError, apiPost } from '@/lib/api';
import { INTEGRATION_CATEGORY_ORDER, useAutonomousStatus, useIntegrations } from '@/lib/hooks';
import type { Integration } from '@/lib/hooks';
import { cn, timeAgo } from '@/lib/utils';

export default function SettingsPage() {
  const { data: integrations, mutate } = useIntegrations();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function act(provider: string, action: 'connect' | 'disconnect' | 'sync') {
    setBusy(`${provider}:${action}`);
    setNote(null);
    try {
      const res = await apiPost<{ pushed?: number; events?: unknown[] }>(`/integrations/${provider}/${action}`);
      if (action === 'sync') setNote({ kind: 'ok', text: `Synced ${provider}: pushed ${res.pushed ?? 0}, pulled ${res.events?.length ?? 0}.` });
      await mutate();
    } catch (e) {
      setNote({ kind: 'err', text: e instanceof ApiError ? e.message : 'Request failed.' });
    } finally {
      setBusy(null);
    }
  }

  if (!integrations) return <Spinner />;

  const accounts = integrations.filter((i) => i.category === 'publishing');
  const rest = integrations.filter((i) => i.category !== 'publishing');
  const byCategory = new Map<string, Integration[]>();
  for (const it of rest) byCategory.set(it.category, [...(byCategory.get(it.category) ?? []), it]);
  const categories = [...byCategory.keys()].sort(
    (a, b) => INTEGRATION_CATEGORY_ORDER.indexOf(a) - INTEGRATION_CATEGORY_ORDER.indexOf(b),
  );

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Publishing accounts, agent controls, and the marketing-stack integrations"
        action={
          <a href={`${API_BASE}/integrations/calendar.ics`} target="_blank" rel="noreferrer">
            <Button variant="secondary"><Download size={15} /> Download .ics</Button>
          </a>
        }
      />

      {note && (
        <Card className={cn('mb-5 p-3 text-xs', note.kind === 'ok' ? 'text-emerald-400' : 'text-amber-400')}>{note.text}</Card>
      )}

      {/* Agent controls */}
      <AgentsSettings />

      {/* Publishing accounts — the scheduler posts through these */}
      <section className="mt-7">
        <h2 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Send size={13} /> Publishing accounts
        </h2>
        <p className="mb-3 text-xs text-muted">The Scheduler posts through these channel accounts. Connect one to publish for real — until then posts publish in simulation only.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {accounts.map((it) => <IntegrationCard key={it.provider} it={it} busy={busy} onAct={act} />)}
        </div>
      </section>

      {/* Marketing-stack integrations */}
      <h2 className="mb-3 mt-8 text-sm font-semibold">Integrations</h2>
      <div className="space-y-7">
        {categories.map((cat) => {
          const items = byCategory.get(cat)!;
          return (
            <section key={cat}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{items[0].categoryLabel}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => <IntegrationCard key={it.provider} it={it} busy={busy} onAct={act} />)}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-7">
        <CardHeader title="How connectors work" subtitle="A flexible catalog — add an integration in one place; honest until configured" />
        <div className="space-y-2 p-5 text-xs text-muted">
          <p className="flex items-start gap-2">
            <Plug size={15} className="mt-0.5 shrink-0" />
            Every integration & account is a catalog entry with its category, capabilities, and required API keys. With no key set it reports <span className="text-foreground">not implemented</span> — it never fakes a connection. Set the keys and fill in the connector to go live.
          </p>
          <p className="flex items-start gap-2">
            <Webhook size={15} className="mt-0.5 shrink-0" />
            Inbound webhook: <code className="rounded bg-surface-2 px-1.5 py-0.5">POST /api/webhooks/calendar</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

/** Engine controls (autonomous + heartbeat) surfaced in Settings. */
function AgentsSettings() {
  const { data: status, mutate } = useAutonomousStatus();

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

  const allOff = status ? !status.enabled && !status.heartbeatEnabled : false;

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5"><Power size={15} /> Agents</span>}
        subtitle="Turn the agent runtime on or off. With both off, no agent runs and zero LLM calls are made."
        action={status && (
          <Button size="sm" variant="secondary" onClick={() => setAll(allOff)}>{allOff ? 'Turn all on' : 'Turn all off'}</Button>
        )}
      />
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {!status ? (
          <Spinner />
        ) : (
          <>
            <ToggleRow icon={Activity} label="Autonomous" desc="Metric loop + agent actions + hourly monitor" on={status.enabled} onToggle={(v) => set('/autonomous/toggle', v)} />
            <ToggleRow icon={HeartPulse} label="Heartbeat" desc="Exercises the full agent roster on a cadence" on={status.heartbeatEnabled} onToggle={(v) => set('/autonomous/heartbeat-toggle', v)} />
          </>
        )}
      </div>
      {status && (
        <p className={cn('px-5 pb-4 text-[11px]', allOff ? 'text-slate-400' : 'text-emerald-400/80')}>
          {allOff ? 'All agents off — no LLM calls.' : `Running · ${status.tickCount} ticks`}
        </p>
      )}
    </Card>
  );
}

function ToggleRow({ icon: Icon, label, desc, on, onToggle }: { icon: LucideIcon; label: string; desc: string; on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <Icon size={16} className={on ? 'text-emerald-400' : 'text-muted'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={`Toggle ${label}`}
        onClick={() => onToggle(!on)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition', on ? 'bg-emerald-500/70' : 'bg-white/15')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-4' : 'left-0.5')} />
      </button>
    </div>
  );
}

function IntegrationCard({ it, busy, onAct }: { it: Integration; busy: string | null; onAct: (provider: string, action: 'connect' | 'disconnect' | 'sync') => void }) {
  const notImpl = it.status === 'not_implemented';
  const connected = it.status === 'connected';
  return (
    <Card className={cn('flex flex-col p-4', notImpl && 'opacity-90')}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {it.label}
            {it.docsUrl && <a href={it.docsUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-foreground"><ExternalLink size={11} /></a>}
          </p>
          <p className="text-[11px] text-muted">{notImpl ? 'Not connected' : it.lastSyncAt ? `Synced ${timeAgo(it.lastSyncAt)}` : 'Never synced'}</p>
        </div>
        <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', connected ? 'bg-emerald-400' : notImpl ? 'bg-slate-500' : 'bg-muted')} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {it.capabilities.slice(0, 4).map((c) => (
          <span key={c} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">{c}</span>
        ))}
      </div>

      <div className="mt-auto">
        {notImpl ? (
          <>
            <Badge tone="">not implemented</Badge>
            <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted">
              <Lock size={11} className="mt-0.5 shrink-0" />
              Set {it.requires.map((r, i) => (
                <span key={r}><code className="rounded bg-surface-2 px-1 py-0.5 text-[9px]">{r}</code>{i < it.requires.length - 1 ? ', ' : ''}</span>
              ))} to enable.
            </p>
            <Button size="sm" variant="secondary" disabled className="mt-3 cursor-not-allowed"><Plug size={13} /> Connect</Button>
          </>
        ) : (
          <>
            <Badge tone={connected ? 'active' : undefined}>{it.status}</Badge>
            <div className="mt-3 flex gap-2">
              {connected ? (
                <>
                  <Button size="sm" disabled={busy !== null} onClick={() => onAct(it.provider, 'sync')}>
                    <RefreshCw size={13} /> {busy === `${it.provider}:sync` ? 'Syncing…' : 'Sync'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => onAct(it.provider, 'disconnect')}>Disconnect</Button>
                </>
              ) : (
                <Button size="sm" disabled={busy !== null} onClick={() => onAct(it.provider, 'connect')}>
                  <Plug size={13} /> Connect
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
