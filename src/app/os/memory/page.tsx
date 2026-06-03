'use client';

import { Clock, Download, FileText, Library, Lock, LockOpen, PencilLine, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge, Button, Spinner } from '@/components/ui';
import { apiPatch } from '@/lib/api';
import { useFiles, useMemoryTimeline } from '@/lib/hooks';
import type { MemoryTimelineEntry } from '@/lib/hooks';
import type { FileAsset } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

function tierOf(imp: number): 'low' | 'medium' | 'high' | 'critical' {
  return imp >= 0.85 ? 'critical' : imp >= 0.6 ? 'high' : imp >= 0.35 ? 'medium' : 'low';
}
const TIER_TONE: Record<string, string> = { low: '', medium: 'warning', high: 'published', critical: 'opportunity' };
const TYPE_TONE: Record<string, string> = { episodic: 'opportunity', procedural: 'published', semantic: '' };

/** File type from extension/mime — drives how the doc is rendered & whether it's editable. */
function fileKind(file: FileAsset): { ext: string; editable: boolean; markdown: boolean } {
  const ext = (file.fileName.split('.').pop() ?? '').toLowerCase();
  const markdown = ext === 'md' || ext === 'markdown';
  // Text-bearing formats can be edited in place; binary docs (PDF/DOCX) are
  // shown as their extracted text, read-only.
  const editable = markdown || ext === 'txt' || file.mimeType?.startsWith('text/');
  return { ext: ext || 'doc', editable, markdown };
}

/** Memory — view & edit every document in Hiive's RAG memory (all file types). */
export default function MemoryApp() {
  const { data: files, mutate } = useFiles();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'library' | 'timeline'>('library');

  if (!files) return <Spinner />;

  const list = files.filter(
    (f) => f.fileName.toLowerCase().includes(filter.toLowerCase()) || (f.text ?? '').toLowerCase().includes(filter.toLowerCase()),
  );
  const active = files.find((f) => f.id === (activeId ?? list[0]?.id)) ?? null;

  return (
    <div className="-m-5 flex flex-col md:-m-8" style={{ height: 'calc(100vh - 0px)' }}>
      {/* tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-[#161616] px-3 py-2">
        {([['library', 'Library', Library], ['timeline', 'Changes over time', Clock]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition', view === key ? 'bg-white/10 text-foreground' : 'text-muted hover:text-foreground')}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {view === 'timeline' ? (
        <MemoryTimeline />
      ) : (
    <div className="flex flex-1 overflow-hidden">
      {/* sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-[#161616]">
        <div className="space-y-2 border-b border-border p-3">
          {/* New document → the create page (all file types: upload or write a note). */}
          <a
            href="/memory"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <Plus size={13} /> New document
          </a>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
            <Search size={13} className="text-muted" />
            <input className="w-full bg-transparent text-xs outline-none" placeholder="Filter memory…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Memory documents</p>
          {list.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className={cn('flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-white/5', active?.id === f.id && 'bg-white/10 text-foreground')}
            >
              <FileText size={13} className="shrink-0 text-muted" />
              <span className="flex-1 truncate">{f.fileName.replace(/\.[^.]+$/, '')}</span>
              <span className="shrink-0 rounded bg-white/5 px-1 text-[9px] font-medium uppercase text-muted">{fileKind(f).ext}</span>
              {f.locked && <Lock size={11} className="shrink-0 text-amber-400" />}
            </button>
          ))}
          {list.length === 0 && <p className="px-2 py-3 text-xs text-muted">No documents.</p>}
        </div>
      </div>

      {/* doc pane */}
      {active ? <DocPane key={active.id} file={active} onSaved={() => mutate()} /> : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
          <p>No document selected</p>
          <a href="/memory" className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
            <Plus size={13} /> Create one
          </a>
        </div>
      )}
    </div>
      )}
    </div>
  );
}

/** Changes over time — what the agents have learned/ingested, newest first. */
function MemoryTimeline() {
  const { data: entries } = useMemoryTimeline();
  if (!entries) return <Spinner />;
  if (entries.length === 0)
    return <div className="flex flex-1 items-center justify-center text-muted">No memory yet.</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-[#1c1c1c] p-6">
      <p className="mb-4 text-xs text-muted">
        Newest memory first — importance bar shows how much weight each holds. Agents (e.g. the marketing analyzer) write learnings here as they confirm what’s working.
      </p>
      <ol className="relative ml-2 space-y-3 border-l border-border pl-5">
        {entries.map((e) => <TimelineRow key={e.id} e={e} />)}
      </ol>
    </div>
  );
}

function TimelineRow({ e }: { e: MemoryTimelineEntry }) {
  const tier = tierOf(e.importance);
  const isInsight = e.tags.includes('marketing_insight');
  const works = e.tags.includes('what_works');
  const fails = e.tags.includes('what_fails');
  return (
    <li className="relative">
      <span className={cn('absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#1c1c1c]', works ? 'bg-emerald-400' : fails ? 'bg-red-400' : isInsight ? 'bg-primary' : 'bg-muted')} />
      <div className="rounded-lg border border-border bg-surface-2 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <Badge tone={TYPE_TONE[e.memoryType] ?? ''}>{e.memoryType}</Badge>
          {isInsight && <Badge tone={works ? 'active' : fails ? 'critical' : ''}>{works ? 'what works' : fails ? "what doesn't" : 'insight'}</Badge>}
          {e.locked && <Lock size={11} className="text-amber-400" />}
          <span className="ml-auto text-[10px] text-muted">{timeAgo(e.createdAt)}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/90">{e.preview}</p>
        <div className="mt-2 flex items-center gap-2">
          {/* importance bar */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div className={cn('h-full rounded-full', tier === 'critical' ? 'bg-fuchsia-400' : tier === 'high' ? 'bg-indigo-400' : tier === 'medium' ? 'bg-amber-400' : 'bg-slate-400')} style={{ width: `${Math.round(e.importance * 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted">importance {Math.round(e.importance * 100)}% · {tier}</span>
          {e.supersededCount > 0 && <span className="text-[10px] text-orange-400">· superseded ×{e.supersededCount}</span>}
        </div>
      </div>
    </li>
  );
}

function DocPane({ file, onSaved }: { file: FileAsset; onSaved: () => void }) {
  const kind = fileKind(file);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(file.text ?? '');
  const [importance, setImportance] = useState(file.importance);
  const [locked, setLocked] = useState(file.locked);
  const [busy, setBusy] = useState<string | null>(null);
  const tier = tierOf(importance);
  const metaDirty = importance !== file.importance || locked !== file.locked;

  async function saveText() {
    setBusy('text');
    try {
      await apiPatch(`/files/${file.id}`, { text });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(null);
    }
  }
  async function saveMeta() {
    setBusy('meta');
    try {
      await apiPatch(`/files/${file.id}`, { importance, locked });
      onSaved();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#1c1c1c]">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={TIER_TONE[tier]}>{tier}</Badge>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">{kind.ext}</span>
          {locked && <Lock size={13} className="text-amber-400" />}
          <span className="text-xs text-muted">{file.chunkCount} chunks · {timeAgo(file.createdAt)}</span>
          {file.url && (
            <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Download size={12} /> Original
            </a>
          )}
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setText(file.text ?? ''); }}>Cancel</Button>
            <Button size="sm" disabled={busy !== null} onClick={saveText}>{busy === 'text' ? 'Saving…' : 'Save'}</Button>
          </div>
        ) : kind.editable ? (
          <Button size="sm" variant="secondary" disabled={locked} onClick={() => { setText(file.text ?? ''); setEditing(true); }}>
            <PencilLine size={13} /> {locked ? 'Locked' : 'Edit'}
          </Button>
        ) : (
          <span className="text-[11px] text-muted">Extracted text · read-only</span>
        )}
      </div>

      {/* tier / lock controls */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-2.5 text-xs">
        <span className="text-muted">Importance</span>
        <input type="range" min={0} max={1} step={0.05} value={importance} disabled={locked} onChange={(e) => setImportance(Number(e.target.value))} className="w-40 accent-primary disabled:opacity-50" />
        <span className="w-8 text-foreground">{Math.round(importance * 100)}%</span>
        <button onClick={() => setLocked((v) => !v)} className={cn('flex items-center gap-1 rounded-md border px-2 py-1', locked ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-border text-muted hover:text-foreground')}>
          {locked ? <Lock size={12} /> : <LockOpen size={12} />} {locked ? 'Locked' : 'Unlocked'}
        </button>
        {metaDirty && <Button size="sm" disabled={busy !== null} onClick={saveMeta}>{busy === 'meta' ? 'Saving…' : 'Save tier'}</Button>}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="mb-4 font-serif text-2xl font-bold">{file.fileName.replace(/\.[^.]+$/, '')}</h1>
        {editing ? (
          <textarea className="input h-[60vh] resize-none font-mono text-[13px] leading-6" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write markdown…" />
        ) : kind.markdown ? (
          <div className="md-body">
            <ReactMarkdown>{file.text || '_No content._'}</ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-foreground/90">{file.text || 'No extracted text available for this document.'}</pre>
        )}
      </div>
    </div>
  );
}
