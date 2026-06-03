'use client';

import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Calendar,
  CalendarClock,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/api';
import { useAutonomousStatus } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AgentRail } from './agent-rail';

interface AppDef {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  w: number;
  h: number;
}

// Each "app" is an existing page rendered in a window — Hiive can equally live
// inside the marketer's existing tools, so the UI is just one surface.
const APPS: AppDef[] = [
  // Mission Control — the complete tabbed dashboard.
  { key: 'dashboard', label: 'Mission Control', href: '/os/dashboard', icon: LayoutDashboard, w: 1180, h: 800 },
  // Themed apps modeled on the marketer's existing tools, powered by Hiive data.
  // Memory — view & edit every document in RAG memory (all file types); "New
  // document" inside it opens the create page (/memory).
  { key: 'memory', label: 'Memory', href: '/os/memory', icon: BrainCircuit, w: 1100, h: 760 },
  { key: 'scheduler', label: 'Scheduler', href: '/os/scheduler', icon: CalendarClock, w: 1060, h: 720 },
  { key: 'analytics', label: 'Analytics', href: '/os/analytics', icon: LineChart, w: 1080, h: 760 },
  // Core functional apps.
  { key: 'calendar', label: 'Content Calendar', href: '/calendar', icon: Calendar, w: 1120, h: 760 },
  { key: 'agents', label: 'Agents', href: '/agent-runs', icon: Bot, w: 920, h: 700 },
  { key: 'missions', label: 'Missions', href: '/missions', icon: Target, w: 920, h: 700 },
  { key: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: Megaphone, w: 1040, h: 720 },
  { key: 'ads', label: 'Ads', href: '/ads', icon: BarChart3, w: 1040, h: 640 },
  { key: 'chat', label: 'Co-pilot', href: '/chat', icon: MessageSquare, w: 780, h: 700 },
  { key: 'settings', label: 'Settings', href: '/settings', icon: Settings, w: 980, h: 720 },
  { key: 'health', label: 'Agent Health', href: '/agent-health', icon: Activity, w: 920, h: 640 },
  { key: 'reflections', label: 'Reflections', href: '/reflections', icon: Sparkles, w: 1040, h: 680 },
];
const APP_BY_KEY = new Map(APPS.map((a) => [a.key, a]));
const DOCK: string[] = ['dashboard', 'memory', 'scheduler', 'analytics', 'calendar', 'agents', 'missions', 'campaigns', 'ads', 'chat', 'settings'];

interface Win {
  id: number;
  appKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized?: boolean;
  prev?: { x: number; y: number; w: number; h: number };
}

export function Desktop() {
  const [wins, setWins] = useState<Win[]>([]);
  const zRef = useRef(10);
  const idRef = useRef(1);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ id: number; sx: number; sy: number; ow: number; oh: number } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [now, setNow] = useState('');

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 20000);
    return () => clearInterval(t);
  }, []);

  // Open a couple of apps so you immediately see the workspace + agents at work.
  useEffect(() => {
    open('dashboard', 48, 48);
    open('memory', 560, 110);
  }, []);

  function open(appKey: string, x?: number, y?: number) {
    const nz = ++zRef.current;
    setWins((prev) => {
      const existing = prev.find((w) => w.appKey === appKey);
      if (existing) {
        return prev.map((w) => (w.appKey === appKey ? { ...w, z: nz, minimized: false } : w));
      }
      const app = APP_BY_KEY.get(appKey)!;
      const id = idRef.current++;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
      return [
        ...prev,
        {
          id,
          appKey,
          x: x ?? Math.max(20, Math.min((vw - app.w) / 2 + (prev.length % 4) * 28, vw - 200)),
          y: y ?? Math.max(40, 60 + (prev.length % 4) * 28),
          w: Math.min(app.w, vw - 40),
          h: Math.min(app.h, vh - 90),
          z: nz,
          minimized: false,
        },
      ];
    });
  }

  function focus(id: number) {
    const nz = ++zRef.current;
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, z: nz, minimized: false } : w)));
  }
  const close = (id: number) => setWins((prev) => prev.filter((w) => w.id !== id));
  const minimize = (id: number) => setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));

  // Green button — toggle full-screen (fills below the menu bar), restores prior size.
  function zoom(id: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setWins((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prev) {
          return { ...w, ...w.prev, maximized: false, prev: undefined };
        }
        return {
          ...w,
          prev: { x: w.x, y: w.y, w: w.w, h: w.h },
          x: 0,
          y: 32,
          w: vw,
          h: vh - 32,
          maximized: true,
        };
      }),
    );
  }

  function onMove(e: React.MouseEvent) {
    if (drag.current) {
      const d = drag.current;
      const x = Math.max(0, d.ox + (e.clientX - d.sx));
      const y = Math.max(36, d.oy + (e.clientY - d.sy));
      setWins((prev) => prev.map((w) => (w.id === d.id ? { ...w, x, y } : w)));
    } else if (resize.current) {
      const r = resize.current;
      const wd = Math.max(380, r.ow + (e.clientX - r.sx));
      const ht = Math.max(260, r.oh + (e.clientY - r.sy));
      setWins((prev) => prev.map((w) => (w.id === r.id ? { ...w, w: wd, h: ht } : w)));
    }
  }
  function endInteract() {
    drag.current = null;
    resize.current = null;
    setInteracting(false);
  }

  const active = [...wins].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
  const activeApp = active ? APP_BY_KEY.get(active.appKey) : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#0a0c12] via-[#10131c] to-[#161a26]">
      {/* wallpaper glow */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-primary/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />

      {/* menu bar */}
      <MenuBar activeLabel={activeApp?.label} clock={now} />

      {/* agents rail — desktop background, right side (windows overlay it) */}
      <AgentRail />

      {/* windows */}
      {wins.filter((w) => !w.minimized).map((w) => {
        const app = APP_BY_KEY.get(w.appKey)!;
        return (
          <div
            key={w.id}
            className={cn(
              'absolute flex flex-col overflow-hidden border border-white/10 bg-surface shadow-2xl shadow-black/50',
              w.maximized ? 'rounded-none' : 'rounded-xl',
            )}
            style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z }}
            onMouseDown={() => focus(w.id)}
          >
            <div
              className="group/title flex h-9 shrink-0 items-center gap-2 border-b border-white/10 bg-surface-2/80 px-3 backdrop-blur"
              onMouseDown={(e) => {
                if (w.maximized) return; // don't drag a full-screen window
                drag.current = { id: w.id, sx: e.clientX, sy: e.clientY, ox: w.x, oy: w.y };
                setInteracting(true);
              }}
              onDoubleClick={() => zoom(w.id)}
            >
              <div className="flex items-center gap-1.5">
                <button onClick={() => close(w.id)} onMouseDown={(e) => e.stopPropagation()} title="Close" className="flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] text-[7px] text-black/50 hover:brightness-110">×</button>
                <button onClick={() => minimize(w.id)} onMouseDown={(e) => e.stopPropagation()} title="Minimize" className="flex h-3 w-3 items-center justify-center rounded-full bg-[#febc2e] text-[7px] text-black/50 hover:brightness-110">–</button>
                <button onClick={() => zoom(w.id)} onMouseDown={(e) => e.stopPropagation()} title={w.maximized ? 'Restore' : 'Full screen'} className="flex h-3 w-3 items-center justify-center rounded-full bg-[#28c840] text-[7px] text-black/50 hover:brightness-110">⤢</button>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-muted">
                <app.icon size={13} /> {app.label}
              </div>
              <span className="w-12" />
            </div>
            <div className="relative flex-1 bg-background">
              <iframe src={app.href} title={app.label} className="h-full w-full border-0" style={{ pointerEvents: interacting ? 'none' : 'auto' }} />
            </div>
            {!w.maximized && (
            <div
              className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                resize.current = { id: w.id, sx: e.clientX, sy: e.clientY, ow: w.w, oh: w.h };
                setInteracting(true);
              }}
            />
            )}
          </div>
        );
      })}

      {/* drag/resize overlay so the mouse doesn't get captured by iframes */}
      {interacting && (
        <div className="fixed inset-0 z-[10000]" style={{ cursor: resize.current ? 'nwse-resize' : 'grabbing' }} onMouseMove={onMove} onMouseUp={endInteract} onMouseLeave={endInteract} />
      )}

      {/* dock */}
      <Dock apps={DOCK.map((k) => APP_BY_KEY.get(k)!)} openKeys={new Set(wins.map((w) => w.appKey))} onOpen={(k) => open(k)} />
    </div>
  );
}

function MenuBar({ activeLabel, clock }: { activeLabel?: string; clock: string }) {
  const { data: status } = useAutonomousStatus();
  return (
    <div className="absolute inset-x-0 top-0 z-[9000] flex h-8 items-center justify-between border-b border-white/10 bg-black/40 px-4 text-xs text-foreground/90 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-semibold"><Sparkles size={13} /> Hiive OS</span>
        {activeLabel && <span className="text-muted">{activeLabel}</span>}
      </div>
      <div className="flex items-center gap-4">
        {status && (
          <span className="flex items-center gap-1.5 text-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', status.allOff ? 'bg-muted' : 'bg-emerald-400 animate-pulse-dot')} />
            {status.allOff
              ? 'Agents off'
              : `Autonomous ${status.enabled ? 'on' : 'off'} · Heartbeat ${status.heartbeatEnabled ? 'on' : 'off'} · ${status.tickCount} ticks`}
          </span>
        )}
        <span className="tabular-nums text-muted">{clock}</span>
      </div>
    </div>
  );
}

function Dock({ apps, openKeys, onOpen }: { apps: AppDef[]; openKeys: Set<string>; onOpen: (k: string) => void }) {
  return (
    <div className="absolute bottom-3 left-1/2 z-[9000] flex -translate-x-1/2 items-end gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl">
      {apps.map((app) => (
        <button key={app.key} onClick={() => onOpen(app.key)} title={app.label} className="group relative flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-surface-2 to-surface text-foreground transition group-hover:-translate-y-1 group-hover:from-primary/30">
            <app.icon size={20} />
          </span>
          <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100">{app.label}</span>
          <span className={cn('mt-0.5 h-1 w-1 rounded-full', openKeys.has(app.key) ? 'bg-foreground/70' : 'bg-transparent')} />
        </button>
      ))}
      <span className="mx-1 h-12 w-px bg-white/10" />
      <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" title="API (Swagger)" className="group flex flex-col items-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-surface-2 to-surface text-muted transition group-hover:-translate-y-1">API</span>
        <span className="mt-0.5 h-1 w-1 rounded-full bg-transparent" />
      </a>
    </div>
  );
}
