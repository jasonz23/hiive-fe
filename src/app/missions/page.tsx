'use client';

import { Plus, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, PageHeader, Spinner } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useMissions } from '@/lib/hooks';
import { timeAgo } from '@/lib/utils';

export default function MissionsPage() {
  const { data: missions, mutate } = useMissions();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', objective: '', target: 130 });

  async function create() {
    if (!form.title) return;
    await apiPost('/missions', {
      title: form.title,
      objective: form.objective || form.title,
      priority: 'high',
      targetMetric: { metric: 'leads', baseline: 100, target: Number(form.target), unit: 'leads' },
    });
    setForm({ title: '', objective: '', target: 130 });
    setOpen(false);
    mutate();
  }

  async function run(id: string) {
    setRunning(id);
    try {
      await apiPost(`/missions/${id}/run`, {});
      mutate();
    } finally {
      setRunning(null);
    }
  }

  if (!missions) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Missions"
        subtitle="Goal-driven work — the Planner orchestrates the agent team"
        action={<Button onClick={() => setOpen((v) => !v)}><Plus size={16} /> New mission</Button>}
      />

      {open && (
        <Card className="mb-6 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Mission title (e.g. Increase founder leads by 30%)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Objective"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-muted">Target leads</label>
            <input
              type="number"
              className="w-24 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
            />
            <Button onClick={create}>Create mission</Button>
          </div>
        </Card>
      )}

      {missions.length === 0 ? (
        <Empty>No missions yet. Create one to kick off the agent team.</Empty>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <Card key={m.id} className="flex items-center justify-between gap-4 p-5">
              <Link href={`/missions/${m.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  <Badge tone={m.status}>{m.status}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">{m.objective}</p>
                <p className="mt-1 text-xs text-muted">
                  {m._count?.campaigns ?? 0} campaigns · {m._count?.agentRuns ?? 0} agent runs · {timeAgo(m.createdAt)}
                </p>
              </Link>
              <Button variant="secondary" size="sm" disabled={running === m.id} onClick={() => run(m.id)}>
                <Play size={14} /> {running === m.id ? 'Running…' : 'Run'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
