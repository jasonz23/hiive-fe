'use client';

import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Calendar,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/missions', label: 'Missions', icon: Target },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/ads', label: 'Ads', icon: BarChart3 },
  { href: '/memory', label: 'Memory', icon: BrainCircuit },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/agent-runs', label: 'Agent Runs', icon: Bot },
  { href: '/agent-health', label: 'Agent Health', icon: Activity },
  { href: '/reflections', label: 'Reflections', icon: Sparkles },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Hiive</p>
            <p className="text-[11px] leading-tight text-muted">Marketing OS</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
                  active
                    ? 'bg-surface-2 font-medium text-foreground'
                    : 'text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
          <p className="text-[11px] font-medium text-foreground">Agentic OS</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Mission → Plan → Generate → Simulate → Approve → Learn
          </p>
        </div>
      </aside>
      <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
