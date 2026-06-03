'use client';

import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Calendar,
  LayoutDashboard,
  Megaphone,
  Settings,
  Sparkles,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import OverviewPage from '@/app/dashboard/page';
import CalendarPage from '@/app/calendar/page';
import CampaignsPage from '@/app/campaigns/page';
import AdsPage from '@/app/ads/page';
import MemoryPage from '@/app/memory/page';
import AgentRunsPage from '@/app/agent-runs/page';
import AgentHealthPage from '@/app/agent-health/page';
import ReflectionsPage from '@/app/reflections/page';
import SettingsPage from '@/app/settings/page';

const TABS: { key: string; label: string; icon: LucideIcon; render: () => React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, render: () => <OverviewPage /> },
  { key: 'calendar', label: 'Calendar', icon: Calendar, render: () => <CalendarPage /> },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone, render: () => <CampaignsPage /> },
  { key: 'ads', label: 'Ads', icon: BarChart3, render: () => <AdsPage /> },
  { key: 'memory', label: 'Memory', icon: BrainCircuit, render: () => <MemoryPage /> },
  { key: 'agents', label: 'Agents', icon: Bot, render: () => <AgentRunsPage /> },
  { key: 'health', label: 'Health', icon: Activity, render: () => <AgentHealthPage /> },
  { key: 'reflections', label: 'Learning', icon: Sparkles, render: () => <ReflectionsPage /> },
  { key: 'settings', label: 'Settings', icon: Settings, render: () => <SettingsPage /> },
];

export default function TabbedDashboard() {
  const [tab, setTab] = useState('overview');
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 mb-2 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-5 py-2 backdrop-blur md:-mx-8 md:px-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition',
              tab === t.key ? 'bg-surface-2 font-medium text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div>{active.render()}</div>
    </div>
  );
}
