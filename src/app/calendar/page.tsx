'use client';

import { ChevronLeft, ChevronRight, Link2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, PageHeader, Spinner } from '@/components/ui';
import { PostDrawer } from '@/components/post-drawer';
import { apiPatch } from '@/lib/api';
import { useCalendarSync, useCampaigns, usePosts } from '@/lib/hooks';
import type { ExternalEvent } from '@/lib/hooks';
import type { Post, PostStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-slate-400',
  review: 'bg-amber-400',
  approved: 'bg-emerald-400',
  scheduled: 'bg-indigo-400',
  published: 'bg-indigo-400',
  analyzing: 'bg-amber-400',
  underperforming: 'bg-orange-400',
  completed: 'bg-emerald-400',
};
const BOARD_COLUMNS: PostStatus[] = [
  'draft', 'review', 'approved', 'scheduled', 'published', 'analyzing', 'underperforming', 'completed',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function postDate(p: Post): Date {
  return new Date(p.scheduledAt ?? p.publishedAt ?? p.createdAt);
}

export default function CalendarPage() {
  const { data: posts, mutate } = usePosts();
  const { data: campaigns } = useCampaigns();
  const { data: sync } = useCalendarSync();
  const [view, setView] = useState<'month' | 'board'>('month');
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [drawer, setDrawer] = useState<{ post: Post | null; createDate: string | null } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  if (!posts || !campaigns) return <Spinner />;

  function onDrop(e: React.DragEvent, patch: Partial<{ scheduledAt: string; status: PostStatus }>) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    void apiPatch(`/posts/${id}`, patch).then(() => mutate());
  }

  const today = dateKey(new Date());
  const connectedSources = (sync?.sources ?? []).filter((s) => s.connected);
  const externalEvents = sync?.events ?? [];

  return (
    <div>
      <PageHeader
        title="Content Calendar"
        subtitle={
          connectedSources.length > 0
            ? `Secondary view — synced with ${connectedSources.map((s) => s.label).join(', ')}`
            : 'Plan, schedule, and move posts through the agent lifecycle'
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {(['month', 'board'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('rounded-md px-3 py-1 text-sm capitalize transition', view === v ? 'bg-surface-2 text-foreground' : 'text-muted')}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button onClick={() => setDrawer({ post: null, createDate: today })}><Plus size={16} /> New post</Button>
          </div>
        }
      />

      {connectedSources.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <Link2 size={14} className="text-primary" />
          <span className="text-foreground">
            This calendar is a secondary view — {connectedSources.map((s) => s.label).join(', ')} {connectedSources.length > 1 ? 'are' : 'is'} the source of truth.
          </span>
          <span className="text-muted">{externalEvents.length} synced event{externalEvents.length === 1 ? '' : 's'} shown alongside Hiive posts.</span>
        </div>
      )}

      <p className="mb-4 text-xs text-muted">
        Drag a post to {view === 'month' ? 'another day to reschedule it' : 'another column to change its status'}. Click a post to edit it inline.
        {connectedSources.length > 0 && ' Dashed chips are read-only events synced from your connected tools.'}
      </p>

      {view === 'month' ? (
        <MonthView
          cursor={cursor}
          setCursor={setCursor}
          posts={posts}
          externalEvents={externalEvents}
          today={today}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDropDay={(e, day) => onDrop(e, { scheduledAt: new Date(`${day}T09:00`).toISOString() })}
          onClickPost={(p) => setDrawer({ post: p, createDate: null })}
          onAddDay={(day) => setDrawer({ post: null, createDate: day })}
        />
      ) : (
        <BoardView
          posts={posts}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDropColumn={(e, status) => onDrop(e, { status })}
          onClickPost={(p) => setDrawer({ post: p, createDate: null })}
        />
      )}

      {drawer && (
        <PostDrawer
          key={drawer.post?.id ?? drawer.createDate ?? 'new'}
          post={drawer.post}
          createDate={drawer.createDate}
          campaigns={campaigns}
          onClose={() => setDrawer(null)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}

function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', post.id)}
      onClick={onClick}
      className="flex w-full cursor-grab items-center gap-1.5 rounded-md border border-border bg-surface-2 px-1.5 py-1 text-left text-[11px] hover:border-primary/50 active:cursor-grabbing"
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[post.status])} />
      <span className="truncate text-muted">{post.platform}: {post.copy.split('\n')[0]}</span>
    </button>
  );
}

/** Read-only event synced from an external source — not a Hiive post. */
function ExternalChip({ event }: { event: ExternalEvent }) {
  return (
    <div
      title={`${event.title} · synced from ${event.source}`}
      className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-1.5 py-1 text-left text-[11px]"
    >
      <Link2 size={11} className="shrink-0 text-muted" />
      <span className="truncate text-muted">{event.source}: {event.title}</span>
    </div>
  );
}

function MonthView({
  cursor, setCursor, posts, externalEvents, today, dragOver, setDragOver, onDropDay, onClickPost, onAddDay,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  posts: Post[];
  externalEvents: ExternalEvent[];
  today: string;
  dragOver: string | null;
  setDragOver: (k: string | null) => void;
  onDropDay: (e: React.DragEvent, day: string) => void;
  onClickPost: (p: Post) => void;
  onAddDay: (day: string) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

  const byDay = new Map<string, Post[]>();
  for (const p of posts) {
    const k = dateKey(postDate(p));
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }

  const externalByDay = new Map<string, ExternalEvent[]>();
  for (const ev of externalEvents) {
    const k = dateKey(new Date(ev.date));
    externalByDay.set(k, [...(externalByDay.get(k) ?? []), ev]);
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">
          {cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
          <button className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}>Today</button>
          <button className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-border text-center text-[11px] text-muted">
        {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const k = dateKey(d);
          const inMonth = d.getMonth() === month;
          const dayPosts = byDay.get(k) ?? [];
          const dayExternal = externalByDay.get(k) ?? [];
          return (
            <div
              key={i}
              onDragOver={(e) => { e.preventDefault(); setDragOver(k); }}
              onDragLeave={() => setDragOver(dragOver === k ? null : dragOver)}
              onDrop={(e) => onDropDay(e, k)}
              className={cn(
                'group min-h-[104px] border-b border-r border-border p-1.5 transition',
                !inMonth && 'bg-surface/40',
                dragOver === k && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                i % 7 === 0 && 'border-l',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('text-[11px]', k === today ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg' : inMonth ? 'text-foreground' : 'text-muted')}>
                  {d.getDate()}
                </span>
                <button onClick={() => onAddDay(k)} className="text-muted opacity-0 transition hover:text-foreground group-hover:opacity-100"><Plus size={13} /></button>
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((p) => <PostChip key={p.id} post={p} onClick={() => onClickPost(p)} />)}
                {dayPosts.length > 3 && <p className="px-1 text-[10px] text-muted">+{dayPosts.length - 3} more</p>}
                {dayExternal.map((ev) => <ExternalChip key={ev.id} event={ev} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardView({
  posts, dragOver, setDragOver, onDropColumn, onClickPost,
}: {
  posts: Post[];
  dragOver: string | null;
  setDragOver: (k: string | null) => void;
  onDropColumn: (e: React.DragEvent, status: PostStatus) => void;
  onClickPost: (p: Post) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_COLUMNS.map((status) => {
        const col = posts.filter((p) => p.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
            onDragLeave={() => setDragOver(dragOver === status ? null : dragOver)}
            onDrop={(e) => onDropColumn(e, status)}
            className={cn(
              'flex w-60 shrink-0 flex-col rounded-xl border border-border bg-surface p-2 transition',
              dragOver === status && 'ring-1 ring-inset ring-primary/40',
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <Badge tone={status}>{status}</Badge>
              <span className="text-xs text-muted">{col.length}</span>
            </div>
            <div className="space-y-1.5">
              {col.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                  onClick={() => onClickPost(p)}
                  className="cursor-grab rounded-lg border border-border bg-surface-2 p-2.5 text-left hover:border-primary/50 active:cursor-grabbing"
                >
                  <p className="line-clamp-2 text-xs">{p.copy.split('\n')[0]}</p>
                  <p className="mt-1 text-[10px] text-muted">{p.platform}{p.metrics?.impressions ? ` · ${p.metrics.ctr}% CTR` : ''}</p>
                </div>
              ))}
              {col.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-muted">Drop here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
