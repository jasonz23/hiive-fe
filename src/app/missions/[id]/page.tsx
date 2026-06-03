'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { Badge, Button, Card, CardHeader, Empty, PageHeader, ProgressBar, Spinner, Stat } from '@/components/ui';
import { apiPost, fetcher } from '@/lib/api';
import { useMission } from '@/lib/hooks';
import { titleCase } from '@/lib/utils';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: mission, mutate } = useMission(id);
  const { data: progress } = useSWR<{ actual: number; target: number; unit: string; pct: number }>(
    id ? `/missions/${id}/progress` : null,
    fetcher,
  );
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      await apiPost(`/missions/${id}/run`, {});
      mutate();
    } finally {
      setRunning(false);
    }
  }

  if (!mission) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={mission.title}
        subtitle={mission.objective}
        action={<Button disabled={running} onClick={run}><Play size={16} /> {running ? 'Running…' : 'Run mission'}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Status" value={<Badge tone={mission.status}>{mission.status}</Badge>} />
        <Stat label="Priority" value={titleCase(mission.priority)} />
        <Stat label="Campaigns" value={mission.campaigns.length} />
        <Stat label="Agent runs" value={mission.agentRuns.length} />
      </div>

      {progress && (
        <Card className="mb-6 p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted">Goal progress</span>
            <span>{progress.actual} / {progress.target} {progress.unit} ({progress.pct}%)</span>
          </div>
          <ProgressBar pct={progress.pct} />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Agent timeline" subtitle="Every subagent the Planner orchestrated" />
          <div className="divide-y divide-border">
            {mission.agentRuns.length === 0 && <div className="p-5"><Empty>Run the mission to see the agent team work</Empty></div>}
            {mission.agentRuns.map((run, i) => (
              <Link key={run.id} href={`/agent-runs/${run.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{run.agentType}</p>
                    <Badge tone={run.status}>{run.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{run.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Campaigns" />
          <div className="divide-y divide-border">
            {mission.campaigns.length === 0 && <div className="p-5"><Empty>None yet</Empty></div>}
            {mission.campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2">
                <p className="text-sm">{c.name}</p>
                <Badge tone={c.health}>{c.health}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
