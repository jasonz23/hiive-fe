'use client';

import { ArrowLeft, ArrowRight, FileText, Lock, PenLine, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Spinner, Stat } from '@/components/ui';
import { apiUpload } from '@/lib/api';
import { useFiles, useMemoryStats } from '@/lib/hooks';
import { cn, formatNumber, timeAgo } from '@/lib/utils';

const TAG_OPTIONS = ['brand_guideline', 'compliance', 'past_performance', 'buyer_persona', 'sell_side_messaging', 'playbook'];
const TIERS: { label: string; value: number }[] = [
  { label: 'Low', value: 0.25 },
  { label: 'Medium', value: 0.5 },
  { label: 'High', value: 0.75 },
  { label: 'Critical', value: 1 },
];

function tierOf(imp: number): 'low' | 'medium' | 'high' | 'critical' {
  return imp >= 0.85 ? 'critical' : imp >= 0.6 ? 'high' : imp >= 0.35 ? 'medium' : 'low';
}
const TIER_TONE: Record<string, string> = { low: '', medium: 'warning', high: 'published', critical: 'opportunity' };

/**
 * Memory — the *creation* surface for Hiive's RAG memory: upload documents or
 * write a markdown note, each with an importance tier + lock. Viewing and
 * editing existing memory lives in the Memory app (/os/memory).
 */
export default function MemoryPage() {
  const { data: files, mutate } = useFiles();
  const { data: stats, mutate: mutateStats } = useMemoryStats();
  const fileRef = useRef<HTMLInputElement>(null);

  // shared tier/lock/tags for whichever creator is used
  const [tags, setTags] = useState<string[]>(['brand_guideline']);
  const [importance, setImportance] = useState(0.5);
  const [locked, setLocked] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // write-a-note creator
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  async function send(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('tags', tags.join(','));
    form.append('importance', String(importance));
    form.append('locked', String(locked));
    const res = await apiUpload<{ chunkCount: number; reconciled: number }>('/files/upload', form);
    setNote(
      res.reconciled > 0
        ? `Ingested ${res.chunkCount} chunks · evolved memory: lowered importance of ${res.reconciled} superseded (unlocked) ${res.reconciled === 1 ? 'memory' : 'memories'}.`
        : `Ingested ${res.chunkCount} chunks.`,
    );
    mutate();
    mutateStats();
  }

  async function upload(file: File) {
    setUploading(true);
    setNote(null);
    try {
      await send(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveNote() {
    const title = noteTitle.trim() || 'Untitled note';
    if (!noteBody.trim()) return;
    setSavingNote(true);
    setNote(null);
    try {
      const fileName = `${title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.md`;
      const md = `# ${title}\n\n${noteBody.trim()}\n`;
      const file = new File([md], fileName, { type: 'text/markdown' });
      await send(file);
      setNoteTitle('');
      setNoteBody('');
    } finally {
      setSavingNote(false);
    }
  }

  if (!files) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="New memory document"
        subtitle="Upload a document (PDF, DOCX, TXT, MD) or write a note — then view & edit it in Memory."
        action={
          <a href="/os/memory" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted hover:text-foreground">
            <ArrowLeft size={14} /> Memory library
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Documents" value={files.length} />
        <Stat label="Chunks" value={formatNumber(stats?.totalChunks)} />
        <Stat label="Locked docs" value={files.filter((f) => f.locked).length} />
        <Stat label="Critical tier" value={files.filter((f) => f.importance >= 0.85).length} />
      </div>

      {/* shared metadata controls */}
      <Card className="mb-6">
        <CardHeader title="Memory tier & tags" subtitle="Applied to whatever you create below" />
        <div className="p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                className={`rounded-md px-2 py-1 text-[11px] transition ${tags.includes(t) ? 'bg-primary/15 text-primary' : 'bg-surface-2 text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Importance tier</p>
              <div className="flex gap-1.5">
                {TIERS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setImportance(t.value)}
                    className={cn('rounded-md border px-3 py-1.5 text-xs transition', importance === t.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted hover:text-foreground')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-xs text-muted">
              <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="accent-primary" />
              <Lock size={12} /> Lock — never let agents auto-change importance
            </label>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* write a note */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-1.5"><PenLine size={15} /> Write a note</span>} subtitle="Compose markdown — saved straight into memory" />
          <div className="space-y-3 p-5">
            <input
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Title — e.g. Q3 sell-side messaging"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <textarea
              className="h-48 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] leading-6 outline-none focus:border-primary"
              placeholder={'Write markdown…\n\n- key message\n- proof point'}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <Button disabled={savingNote || !noteBody.trim()} onClick={saveNote}>
              {savingNote ? 'Saving…' : 'Save to memory'}
            </Button>
          </div>
        </Card>

        {/* upload */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-1.5"><Upload size={15} /> Upload document</span>} subtitle="PDF, DOCX, TXT, MD" />
          <div className="p-5">
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-center">
              <FileText size={28} className="mb-2 text-muted" />
              <p className="mb-3 text-xs text-muted">Drop in a brand guideline, playbook, or research doc.</p>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Choose file'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {note && <p className="mt-3 text-[11px] text-emerald-400/90">{note}</p>}

      {/* recently created — read-only peek; open in Markdown to view/edit */}
      <Card className="mt-6">
        <CardHeader
          title="Recently created"
          subtitle="Open the Memory app to view & edit"
        />
        <div className="space-y-2 p-5">
          {files.length === 0 && <Empty>No documents yet</Empty>}
          {files.slice(0, 8).map((f) => (
            <a
              key={f.id}
              href="/os/memory"
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 transition hover:border-primary/50"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={15} className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm">
                    {f.fileName}
                    {f.locked && <Lock size={11} className="shrink-0 text-amber-400" />}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge tone={TIER_TONE[tierOf(f.importance)]}>{tierOf(f.importance)}</Badge>
                    <span className="text-[10px] text-muted">{f.chunkCount} chunks · {timeAgo(f.createdAt)}</span>
                  </div>
                </div>
              </div>
              <ArrowRight size={15} className="shrink-0 text-muted" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
