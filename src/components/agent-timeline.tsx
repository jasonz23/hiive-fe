import {
  Brain,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { ReactNode } from 'react';
import type { AgentStep } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICON: Record<string, ReactNode> = {
  thought: <Brain size={14} />,
  memory: <Search size={14} />,
  tool_call: <Wrench size={14} />,
  tool_result: <Wrench size={14} />,
  output: <CheckCircle2 size={14} />,
  recommendation: <Lightbulb size={14} />,
  approval: <MessageSquare size={14} />,
  reflection: <Sparkles size={14} />,
};

const COLOR: Record<string, string> = {
  thought: 'text-indigo-400 border-indigo-500/40',
  memory: 'text-cyan-400 border-cyan-500/40',
  tool_call: 'text-amber-400 border-amber-500/40',
  tool_result: 'text-amber-400 border-amber-500/40',
  output: 'text-emerald-400 border-emerald-500/40',
  recommendation: 'text-orange-400 border-orange-500/40',
  approval: 'text-purple-400 border-purple-500/40',
  reflection: 'text-pink-400 border-pink-500/40',
};

export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  if (!steps?.length) {
    return <p className="text-sm text-muted">No steps recorded.</p>;
  }
  return (
    <ol className="relative space-y-3 pl-2">
      {steps.map((step, i) => (
        <li key={step.id} className="relative flex gap-3">
          {i < steps.length - 1 && (
            <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-border" />
          )}
          <span
            className={cn(
              'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-surface',
              COLOR[step.type] ?? 'text-muted border-border',
            )}
          >
            {ICON[step.type] ?? <Brain size={14} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm text-foreground">{step.label}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted">{step.type.replace('_', ' ')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
