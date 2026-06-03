'use client';

import { Bot, BrainCircuit, Check, MessageSquarePlus, PencilLine, User, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useComments } from '@/lib/hooks';
import type { Post, PostComment } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

// Once live, feedback is for learning — we don't edit the shipped post.
const LIVE_STATUSES = ['published', 'analyzing', 'underperforming', 'completed'];

interface Draft {
  type: 'comment' | 'suggestion';
  start: number;
  end: number;
  text: string;
}

function selectionOffsets(container: HTMLElement): { start: number; end: number; text: string } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const text = range.toString();
  if (!text.trim()) return null;
  return { start, end: start + text.length, text };
}

/** Builds the copy as text segments, wrapping commented ranges in <mark>. */
function renderSegments(copy: string, comments: PostComment[]) {
  const ranges = comments
    .filter((c) => c.status === 'open' && c.rangeStart != null && c.rangeEnd != null)
    .map((c) => ({ start: c.rangeStart as number, end: c.rangeEnd as number, kind: c.authorKind }))
    .sort((a, b) => a.start - b.start);

  const segs: { text: string; mark?: 'agent' | 'human' }[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor || r.start >= r.end || r.end > copy.length) continue;
    if (r.start > cursor) segs.push({ text: copy.slice(cursor, r.start) });
    segs.push({ text: copy.slice(r.start, r.end), mark: r.kind === 'agent' ? 'agent' : 'human' });
    cursor = r.end;
  }
  if (cursor < copy.length) segs.push({ text: copy.slice(cursor) });
  return segs;
}

export function PostDoc({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const { data: comments, mutate } = useComments(post.id);
  const docRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; y: number; sel: { start: number; end: number; text: string } } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [body, setBody] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [editing, setEditing] = useState(false);
  const [copyDraft, setCopyDraft] = useState(post.copy);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const isLive = LIVE_STATUSES.includes(post.status);
  const open = (comments ?? []).filter((c) => c.status === 'open');
  const resolved = (comments ?? []).filter((c) => c.status !== 'open');

  function onMouseUp() {
    if (editing) return;
    const sel = docRef.current && selectionOffsets(docRef.current);
    if (!sel) {
      setBar(null);
      return;
    }
    const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
    setBar({ x: rect.left + rect.width / 2, y: rect.top - 8, sel });
  }

  function startDraft(type: 'comment' | 'suggestion') {
    if (!bar) return;
    setDraft({ type, ...bar.sel });
    setBody('');
    setSuggestion(bar.sel.text);
    setBar(null);
  }

  async function submitDraft() {
    if (!draft || !body.trim()) return;
    setBusy(true);
    try {
      await apiPost(`/posts/${post.id}/comments`, {
        type: draft.type,
        body,
        quotedText: draft.text,
        rangeStart: draft.start,
        rangeEnd: draft.end,
        suggestedText: draft.type === 'suggestion' ? suggestion : undefined,
      });
      setDraft(null);
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function act(commentId: string, action: 'accept' | 'reject' | 'resolve') {
    setBusy(true);
    try {
      await apiPost(`/posts/${post.id}/comments/${commentId}/${action}`, {});
      await mutate();
      onChanged();
      if (action === 'accept') {
        setNote(
          isLive
            ? 'Saved to the memory bank + spun a new draft variant — the live post is unchanged.'
            : 'Applied to the draft and saved to the memory bank.',
        );
      } else if (action === 'reject') {
        setNote('Recorded in the memory bank — agents will learn from this.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function choose(commentId: string, optionId: string) {
    setBusy(true);
    try {
      await apiPost(`/posts/${post.id}/comments/${commentId}/choose`, { optionId });
      await mutate();
      onChanged();
      setNote(
        isLive
          ? 'Saved your pick to the memory bank + spun a new draft variant — the live post is unchanged.'
          : 'Applied your pick and saved it to the memory bank.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveCopy() {
    setBusy(true);
    try {
      const res = await apiPost<{ appliedInPlace: boolean; unchanged: boolean }>(
        `/posts/${post.id}/copy-edit`,
        { copy: copyDraft },
      );
      setEditing(false);
      onChanged();
      if (res.unchanged) {
        setNote(null);
      } else {
        setNote(
          res.appliedInPlace
            ? 'Saved to the draft and captured to the memory bank.'
            : 'Post is live — saved your edit to the memory bank + created a new draft variant.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const segments = renderSegments(post.copy, comments ?? []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {bar && (
        <div
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 shadow-xl"
          style={{ left: bar.x, top: bar.y }}
        >
          <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground hover:bg-border" onClick={() => startDraft('comment')}>
            <MessageSquarePlus size={13} /> Comment
          </button>
          <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground hover:bg-border" onClick={() => startDraft('suggestion')}>
            <PencilLine size={13} /> Suggest
          </button>
        </div>
      )}
      {note && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground lg:col-span-2">
          <BrainCircuit size={14} className="shrink-0 text-primary" />
          <span>{note}</span>
          <button onClick={() => setNote(null)} className="ml-auto shrink-0 text-muted hover:text-foreground"><X size={13} /></button>
        </div>
      )}
      {/* Document */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">Document</h3>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setCopyDraft(post.copy); }}>Cancel</Button>
              <Button size="sm" disabled={busy} onClick={saveCopy}>Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => { setCopyDraft(post.copy); setEditing(true); }}>
              <PencilLine size={13} /> Edit copy
            </Button>
          )}
        </div>
        <div className="p-5">
          {editing ? (
            <>
              <textarea
                className="input h-72 resize-y font-[inherit] text-sm leading-relaxed"
                value={copyDraft}
                onChange={(e) => setCopyDraft(e.target.value)}
              />
              {isLive && (
                <p className="mt-2 text-[11px] text-amber-400/90">
                  This post is live — saving won’t change it. Your rewrite is captured to the memory bank and added as a new draft variant.
                </p>
              )}
            </>
          ) : (
            <div
              ref={docRef}
              onMouseUp={onMouseUp}
              className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            >
              {segments.map((s, i) =>
                s.mark ? (
                  <mark
                    key={i}
                    className={cn(
                      'rounded px-0.5',
                      s.mark === 'agent' ? 'bg-amber-500/25 text-amber-200' : 'bg-indigo-500/25 text-indigo-200',
                    )}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          )}
          {!editing && (
            <p className="mt-3 text-[11px] text-muted">Select any text to comment or suggest an edit. Agent suggestions are highlighted in amber.</p>
          )}
        </div>
      </div>

      {/* Comment thread */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Comments</h3>
          <span className="text-xs text-muted">{open.length} open</span>
        </div>

        {draft && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-[11px] text-muted">
              {draft.type === 'suggestion' ? 'Suggesting an edit to' : 'Commenting on'}: “{draft.text.slice(0, 60)}”
            </p>
            {draft.type === 'suggestion' && (
              <textarea className="input mb-2 h-16 resize-y text-xs" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="Replacement text" />
            )}
            <textarea className="input h-14 resize-y text-xs" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note…" autoFocus />
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={busy || !body.trim()} onClick={submitDraft}>Post</Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {open.length === 0 && !draft && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
            No open comments yet. Agents leave suggestions here as the post is analyzed and monitored — or select any text to add your own.
          </p>
        )}

        {open.map((c) => <CommentCard key={c.id} c={c} busy={busy} onAct={act} onChoose={choose} />)}

        {resolved.length > 0 && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer py-1">{resolved.length} resolved</summary>
            <div className="mt-2 space-y-2">
              {resolved.map((c) => <CommentCard key={c.id} c={c} busy={busy} onAct={act} onChoose={choose} />)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  c, busy, onAct, onChoose,
}: {
  c: PostComment;
  busy: boolean;
  onAct: (id: string, a: 'accept' | 'reject' | 'resolve') => void;
  onChoose: (id: string, optionId: string) => void;
}) {
  const isAgent = c.authorKind === 'agent';
  const hasOptions = c.type === 'suggestion' && (c.options?.length ?? 0) > 0;
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', isAgent ? 'text-amber-400' : 'text-indigo-300')}>
          {isAgent ? <Bot size={13} /> : <User size={13} />}
          {c.author}
        </span>
        <div className="flex items-center gap-1.5">
          {c.type === 'suggestion' && <Badge>{hasOptions ? 'pick one' : 'suggestion'}</Badge>}
          {c.status !== 'open' && <Badge tone={c.status === 'accepted' ? 'approved' : c.status === 'rejected' ? 'rejected' : undefined}>{c.status}</Badge>}
        </div>
      </div>
      {c.quotedText && (
        <p className="mb-1.5 border-l-2 border-border pl-2 text-[11px] italic text-muted">“{c.quotedText.slice(0, 120)}”</p>
      )}
      <p className="text-xs text-foreground">{c.body}</p>

      {hasOptions ? (
        <div className="mt-2 space-y-1.5">
          {c.options!.map((o) => (
            <div key={o.id} className={cn('rounded-lg border p-2', c.chosenOptionId === o.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border bg-surface')}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-foreground">{o.label}</span>
                {c.status === 'open' ? (
                  <Button size="sm" disabled={busy} onClick={() => onChoose(c.id, o.id)}>Use this</Button>
                ) : c.chosenOptionId === o.id ? (
                  <span className="text-[10px] text-emerald-400">chosen</span>
                ) : null}
              </div>
              <p className="text-[11px] text-muted">{o.text ? o.text.slice(0, 160) : '(remove the flagged text)'}</p>
            </div>
          ))}
          {c.status === 'open' && (
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onAct(c.id, 'reject')}><X size={12} /> Dismiss</Button>
          )}
        </div>
      ) : (
        <>
          {c.type === 'suggestion' && c.suggestedText && (
            <p className="mt-1.5 rounded bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">→ {c.suggestedText.slice(0, 160)}</p>
          )}
          {c.status === 'open' && (
            <div className="mt-2 flex gap-1.5">
              {c.type === 'suggestion' ? (
                <>
                  <Button size="sm" disabled={busy} onClick={() => onAct(c.id, 'accept')}><Check size={12} /> Accept</Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => onAct(c.id, 'reject')}><X size={12} /> Reject</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAct(c.id, 'resolve')}>Resolve</Button>
              )}
            </div>
          )}
        </>
      )}
      <p className="mt-1.5 text-[10px] text-muted">{timeAgo(c.createdAt)}</p>
    </div>
  );
}
