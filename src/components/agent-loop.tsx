import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The marketing-OS cycle that every campaign moves through. `active` highlights
 * the phase the campaign is currently in so the loop is easy to read at a glance.
 */
const PHASES = [
  'Memory', 'Plan', 'Generate', 'Simulate', 'Approve', 'Track', 'Analyze', 'Recommend', 'Learn',
] as const;

export type LoopPhase = (typeof PHASES)[number];

export function AgentLoop({ active }: { active?: LoopPhase }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PHASES.map((phase, i) => (
        <div key={phase} className="flex items-center gap-1.5">
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              phase === active
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border bg-surface-2 text-muted',
            )}
          >
            {phase}
          </span>
          {i < PHASES.length - 1 && <ArrowRight size={12} className="text-border" />}
        </div>
      ))}
    </div>
  );
}
