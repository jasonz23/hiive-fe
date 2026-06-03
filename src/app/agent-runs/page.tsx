'use client';

import Link from 'next/link';
import { Badge, Card, Empty, PageHeader, Spinner } from '@/components/ui';
import { useAgentRuns } from '@/lib/hooks';
import { timeAgo } from '@/lib/utils';

export default function AgentRunsPage() {
  const { data: runs } = useAgentRuns();
  if (!runs) return <Spinner />;

  return (
    <div>
      <PageHeader title="Agent Runs" subtitle="Every action the agent team has taken" />
      {runs.length === 0 ? (
        <Empty>No agent runs yet.</Empty>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <Link key={run.id} href={`/agent-runs/${run.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{run.agentType}</p>
                    <Badge tone={run.status}>{run.status}</Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{run.summary}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{run._count?.steps ?? 0} steps</p>
                  <p>{timeAgo(run.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
