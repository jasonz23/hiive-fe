'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { Bot, ChevronDown } from 'lucide-react';
import { useAgentRuns, useAgents } from '@/lib/hooks';
import type { AgentRun } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { EngineControls } from './engine-controls';

const STEP_TONE: Record<string, string> = {
  completed: 'bg-emerald-400',
  running: 'bg-amber-400',
  failed: 'bg-red-400',
  pending: 'bg-muted',
  skipped: 'bg-slate-400',
};

/**
 * The agent rail — sits on the desktop background (right side). Each agent is a
 * collapsed Radix accordion item; expanding it reveals that agent's recent run log.
 */
export function AgentRail() {
  const { data: agentList } = useAgents();
  const { data: runs } = useAgentRuns();

  const byAgent = new Map<string, AgentRun[]>();
  for (const r of runs ?? []) {
    byAgent.set(r.agentType, [...(byAgent.get(r.agentType) ?? []), r]);
  }
  const agents = (agentList?.agents ?? [...byAgent.keys()]).slice().sort();

  return (
    <div
      className="absolute right-4 top-12 bottom-24 z-[5] flex w-72 flex-col"
      style={{ zIndex: 5 }}
    >
      <EngineControls />
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
        <Bot size={13} /> Agents
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 backdrop-blur-md">
        <Accordion.Root type="multiple" className="divide-y divide-white/5">
          {agents.map((agent) => {
            const list = (byAgent.get(agent) ?? []).slice(0, 8);
            const latest = list[0];
            const dot = latest ? STEP_TONE[latest.status] ?? 'bg-muted' : 'bg-muted/40';
            return (
              <Accordion.Item key={agent} value={agent}>
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground/90 hover:bg-white/5">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot, latest?.status === 'running' && 'animate-pulse-dot')} />
                    <span className="flex-1 truncate">{agent.replace(/Agent$/, '')}</span>
                    <span className="text-[10px] text-muted">{list.length}</span>
                    <ChevronDown size={13} className="text-muted transition group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-none">
                  <div className="space-y-1.5 px-3 pb-2.5">
                    {list.length === 0 ? (
                      <p className="py-1 text-[11px] text-muted">No runs yet.</p>
                    ) : (
                      list.map((r) => (
                        <div key={r.id} className="rounded-md border border-white/5 bg-surface/60 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('inline-flex items-center gap-1 text-[10px]', r.status === 'failed' ? 'text-red-400' : r.status === 'completed' ? 'text-emerald-400' : r.status === 'skipped' ? 'text-slate-400' : 'text-amber-400')}>
                              <span className={cn('h-1 w-1 rounded-full', STEP_TONE[r.status] ?? 'bg-muted')} /> {r.status}
                            </span>
                            <span className="text-[10px] text-muted">{r._count?.steps ?? 0} steps · {timeAgo(r.createdAt)}</span>
                          </div>
                          {r.summary && <p className="mt-1 line-clamp-2 text-[11px] text-muted">{r.summary}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      </div>
    </div>
  );
}
