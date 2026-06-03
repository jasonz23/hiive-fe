'use client';

import { Badge, Card, Empty, PageHeader, Spinner } from '@/components/ui';
import { useLearning, useReflections } from '@/lib/hooks';
import { timeAgo } from '@/lib/utils';

export default function ReflectionsPage() {
  const { data: reflections } = useReflections();
  const { data: learning } = useLearning();
  if (!reflections) return <Spinner />;

  return (
    <div>
      <PageHeader title="Reflections & Learning" subtitle="The feedback loops that improve the agents over time" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">Agent reflections</h3>
            <p className="text-xs text-muted">Auto-generated after every run</p>
          </div>
          <div className="divide-y divide-border">
            {reflections.length === 0 && <div className="p-5"><Empty>No reflections yet</Empty></div>}
            {reflections.slice(0, 20).map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.agentType}</p>
                  {r.score != null && <span className="text-xs font-semibold text-pink-400">{(r.score * 100).toFixed(0)}%</span>}
                </div>
                {r.improvement && <p className="mt-1 text-xs text-muted"><span className="text-primary">Improve:</span> {r.improvement}</p>}
                <p className="mt-1 text-[11px] text-muted">{timeAgo(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">Learning examples</h3>
            <p className="text-xs text-muted">Human edits captured for future generations</p>
          </div>
          <div className="divide-y divide-border">
            {(!learning || learning.length === 0) && <div className="p-5"><Empty>No learning captured yet — edit or reject an approval</Empty></div>}
            {learning?.slice(0, 20).map((l) => (
              <div key={l.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{l.agentType}</p>
                  <Badge tone={l.approvalStatus ?? undefined}>{l.approvalStatus ?? 'edited'}</Badge>
                </div>
                {l.reason && <p className="mt-1 text-xs text-muted">Reason: {l.reason}</p>}
                <p className="mt-1 line-clamp-2 text-xs text-emerald-400/80">Preferred: {l.editedOutput}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
