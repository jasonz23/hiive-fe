'use client';

import { useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { apiPost } from '@/lib/api';
import type { Approval } from '@/lib/types';
import { titleCase } from '@/lib/utils';

/**
 * A single approval gate with approve / edit / reject. Editing or rejecting an
 * agent proposal is captured server-side as a learning example.
 */
export function ApprovalCard({ approval, onChange }: { approval: Approval; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const proposedCopy = (approval.proposedAction?.copy as string) ?? JSON.stringify(approval.proposedAction);
  const [edited, setEdited] = useState(proposedCopy);
  const [feedback, setFeedback] = useState('');

  async function run(path: string, body?: unknown) {
    setBusy(true);
    try {
      await apiPost(`/approvals/${approval.id}/${path}`, body);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{approval.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone="pending">{titleCase(approval.type)}</Badge>
            {approval.agentRun && <span className="text-xs text-muted">{approval.agentRun.agentType}</span>}
          </div>
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" disabled={busy} onClick={() => run('approve')}>Approve</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => run('reject', { feedback })}>Reject</Button>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface p-2.5">
        {editing ? (
          <>
            <textarea className="input h-24 resize-y text-xs" value={edited} onChange={(e) => setEdited(e.target.value)} />
            <input className="input mt-2 text-xs" placeholder="Why did you edit this? (captured as learning)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => run('edit', { editedAction: { ...approval.proposedAction, copy: edited }, feedback })}>Save &amp; approve</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-xs text-muted">{proposedCopy}</p>
        )}
      </div>
    </div>
  );
}
