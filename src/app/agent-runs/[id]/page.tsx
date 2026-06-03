'use client';

import { useParams } from 'next/navigation';
import { AgentTimeline } from '@/components/agent-timeline';
import { Badge, Card, CardHeader, Empty, PageHeader, Spinner } from '@/components/ui';
import { useAgentRun } from '@/lib/hooks';

export default function AgentRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run } = useAgentRun(id);
  if (!run) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={run.agentType}
        subtitle={run.summary ?? undefined}
        action={<Badge tone={run.status}>{run.status}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Timeline" subtitle="Visible agent reasoning + actions" />
          <div className="p-5">
            <AgentTimeline steps={run.steps ?? []} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Reflection" subtitle="What the agent learned" />
          <div className="space-y-3 p-5 text-sm">
            {(run.reflections?.length ?? 0) === 0 ? (
              <Empty>No reflection</Empty>
            ) : (
              run.reflections!.map((r) => (
                <div key={r.id} className="space-y-2">
                  {r.score != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Score</span>
                      <span className="font-semibold text-pink-400">{(r.score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {r.whatWorked && <p className="text-xs"><span className="font-medium text-emerald-400">Worked:</span> <span className="text-muted">{r.whatWorked}</span></p>}
                  {r.whatFailed && <p className="text-xs"><span className="font-medium text-amber-400">Failed:</span> <span className="text-muted">{r.whatFailed}</span></p>}
                  {r.improvement && <p className="text-xs"><span className="font-medium text-primary">Improve:</span> <span className="text-muted">{r.improvement}</span></p>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
