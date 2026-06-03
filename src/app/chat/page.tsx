'use client';

import { ChevronRight, Database, Search, Send, Wrench, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Card, PageHeader } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
}
interface Message {
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolCall[];
  runId?: string;
}

// Tools that change app state — surfaced distinctly so it's clear the co-pilot DID something.
const ACTION_TOOLS = new Set([
  'approvePost',
  'publishPost',
  'refreshPostMetrics',
  'runAgent',
  'createPostDraft',
  'updatePost',
  'connectIntegration',
  'syncIntegration',
  'createRecommendation',
]);

const SUGGESTIONS = [
  'What campaigns are underperforming?',
  'Summarize what we know about sell-side messaging.',
  'Approve the next post waiting for review.',
  'Run the performance agent on our worst post.',
  'Connect Notion and sync the calendar.',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { mutate } = useSWRConfig();

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiPost<{ answer: string; toolCalls: ToolCall[]; runId: string }>('/chat', {
        message: text,
        history,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer, tools: res.toolCalls, runId: res.runId },
      ]);
      // If the co-pilot took an action, revalidate the rest of the OS so its
      // changes (approvals, publishes, agent runs, syncs) show up everywhere.
      if (res.toolCalls.some((t) => ACTION_TOOLS.has(t.tool))) {
        void mutate(() => true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader title="Co-pilot" subtitle="Ask anything, or tell it to act — it calls Hiive's tools and shows its work" />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted">Try one of these:</p>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' ? (
                <div className="max-w-[88%] space-y-2">
                  {m.tools && m.tools.length > 0 && <AgentTrace tools={m.tools} runId={m.runId} />}
                  <div className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-fg">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted">
                <Wrench size={13} className="animate-pulse" />
                <span className="animate-pulse-dot">Working — calling tools…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Ask the co-pilot, or tell it to do something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
            />
            <button
              onClick={() => send(input)}
              disabled={loading}
              className="flex items-center justify-center rounded-lg bg-primary px-4 text-primary-fg disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** The agent loop's tool calls — what the co-pilot looked at / did to answer. */
function AgentTrace({ tools, runId }: { tools: ToolCall[]; runId?: string }) {
  const actions = tools.filter((t) => ACTION_TOOLS.has(t.tool)).length;
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-2.5">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <Wrench size={11} /> Agent ran {tools.length} tool{tools.length === 1 ? '' : 's'}
          {actions > 0 && <span className="text-amber-400">· {actions} action{actions === 1 ? '' : 's'} taken</span>}
        </span>
        {runId && (
          <a href={`/agent-runs/${runId}`} className="text-[10px] text-muted hover:text-primary">full run →</a>
        )}
      </div>
      <div className="space-y-1">
        {tools.map((t, i) => <ToolStep key={i} call={t} index={i} />)}
      </div>
    </div>
  );
}

function ToolStep({ call, index }: { call: ToolCall; index: number }) {
  const [open, setOpen] = useState(false);
  const isAction = ACTION_TOOLS.has(call.tool);
  const Icon = isAction ? Zap : call.tool.toLowerCase().includes('search') || call.tool.toLowerCase().includes('memory') ? Search : Database;
  const argSummary = Object.entries(call.arguments)
    .map(([k, v]) => `${k}: ${truncate(String(v), 32)}`)
    .join(', ');

  return (
    <div className={cn('rounded-lg border bg-surface-2', isAction ? 'border-amber-500/30' : 'border-border')}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <span className="text-[10px] tabular-nums text-muted">{index + 1}</span>
        <Icon size={12} className={isAction ? 'text-amber-400' : 'text-primary'} />
        <span className="font-mono text-[11px] text-foreground">{call.tool}</span>
        {argSummary && <span className="flex-1 truncate text-[10px] text-muted">{argSummary}</span>}
        <ChevronRight size={12} className={cn('shrink-0 text-muted transition', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-2.5 py-2">
          {Object.keys(call.arguments).length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">Arguments</p>
              <pre className="overflow-x-auto rounded bg-background/60 p-2 text-[10px] leading-relaxed text-foreground/80">{prettify(call.arguments)}</pre>
            </div>
          )}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">Result</p>
            <pre className="max-h-48 overflow-auto rounded bg-background/60 p-2 text-[10px] leading-relaxed text-foreground/80">{prettify(call.result)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function prettify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
