'use client';

import { Card, Empty, PageHeader, ProgressBar, Spinner } from '@/components/ui';
import { useAgentHealth } from '@/lib/hooks';

export default function AgentHealthPage() {
  const { data: health } = useAgentHealth();
  if (!health) return <Spinner />;

  return (
    <div>
      <PageHeader title="Agent Health" subtitle="Approval, success rates, and reflection scores per agent" />
      {health.length === 0 ? (
        <Empty>No agent activity yet.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {health.map((h) => (
            <Card key={h.agentType} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{h.agentType}</h3>
                <span className="text-xs text-muted">{h.runs} runs</span>
              </div>
              <div className="space-y-3">
                <Metric label="Success rate" pct={h.successRate} tone="bg-emerald-500" />
                <Metric label="Approval rate" pct={h.approvalRate} tone="bg-indigo-500" />
                <Metric label="Avg reflection score" pct={Math.round(h.avgReflectionScore * 100)} tone="bg-pink-500" />
              </div>
              <p className="mt-3 text-xs text-muted">{h.recommendations} recommendations created</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span>{pct}%</span>
      </div>
      <ProgressBar pct={pct} tone={tone} />
    </div>
  );
}
