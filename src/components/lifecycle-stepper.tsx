import { Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostStatus } from '@/lib/types';

/**
 * Visualizes where a post sits in the agentic lifecycle loop:
 *   Draft → Compliance → Analyze → Approve → Publish → Monitor → Learn
 * Analysis happens BEFORE publish (the simulation swarm predicts performance),
 * and again AFTER publish as monitoring. Post-publish, the monitor feeds the
 * memory bank and drafts variants rather than editing the live post.
 */
const STAGES: { label: string; actor: string }[] = [
  { label: 'Draft', actor: 'Content Agent' },
  { label: 'Compliance', actor: 'Compliance Agent' },
  { label: 'Analyze', actor: 'Simulation Swarm' },
  { label: 'Approve', actor: 'Human' },
  { label: 'Publish', actor: 'Live' },
  { label: 'Monitor', actor: 'Monitor Agent' },
  { label: 'Learn', actor: 'Memory bank' },
];

// Where each post status lands on the stepper. Compliance + Analyze both run
// while the post is in `review`; `analyzing`/`underperforming` are post-publish
// monitoring; `completed` is the learning/terminal stage.
const INDEX: Record<PostStatus, number> = {
  draft: 0,
  review: 2,
  approved: 3,
  scheduled: 3,
  published: 4,
  analyzing: 5,
  underperforming: 5,
  completed: 6,
};

export function LifecycleStepper({ status }: { status: PostStatus }) {
  const current = INDEX[status] ?? 0;
  const looping = status === 'underperforming';

  return (
    <div>
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          const isLoopStage = looping && active;
          return (
            <div key={stage.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition',
                    isLoopStage
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-400'
                      : active
                        ? 'border-primary bg-primary text-primary-fg'
                        : done
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                          : 'border-border bg-surface text-muted',
                  )}
                >
                  {isLoopStage ? <RefreshCw size={13} /> : done ? <Check size={13} /> : i + 1}
                </span>
                <span className={cn('whitespace-nowrap text-[10px]', active ? 'text-foreground' : 'text-muted')}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span className={cn('mx-1 h-px flex-1 transition', i < current ? 'bg-emerald-500/40' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {looping ? (
          <span className="text-orange-400">
            ↻ Monitor agent found underperformance — it learns from your picks (saved to the memory bank) and drafts new variants instead of editing the live post.
          </span>
        ) : (
          <>
            Owner of this stage: <span className="text-foreground">{STAGES[current]?.actor}</span>. The loop:
            generate → comply → analyze → approve → publish → monitor → learn. Post-publish feedback feeds the memory bank, not the live post.
          </>
        )}
      </p>
    </div>
  );
}
