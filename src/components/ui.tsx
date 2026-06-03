import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn, titleCase } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface', className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const variants = {
    primary: 'bg-primary text-primary-fg hover:opacity-90',
    secondary: 'bg-surface-2 text-foreground border border-border hover:bg-border',
    ghost: 'text-muted hover:text-foreground hover:bg-surface-2',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
  };
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm' };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

const TONE: Record<string, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  analyzing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  review: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  awaiting_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  at_risk: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  underperforming: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  opportunity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  published: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  scheduled: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  running: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  executing: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  planning: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  edited: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  skipped: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = (tone && TONE[tone]) || 'bg-surface-2 text-muted border-border';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
        cls,
      )}
    >
      {typeof children === 'string' ? titleCase(children) : children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight', tone)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
      Loading…
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function ProgressBar({ pct, tone }: { pct: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={cn('h-full rounded-full bg-primary transition-all', tone)}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
