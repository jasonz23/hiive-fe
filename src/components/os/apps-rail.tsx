'use client';

import { LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AppInfo {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

/**
 * The apps guide — sits on the desktop background (left side). Lists every app
 * with its icon + a short description; click an item to open it. Mirrors the
 * agent rail on the right.
 */
export function AppsRail({
  apps,
  onOpen,
}: {
  apps: AppInfo[];
  onOpen: (key: string) => void;
}) {
  return (
    <div
      className="absolute left-4 top-12 bottom-24 z-[5] flex w-72 flex-col"
      style={{ zIndex: 5 }}
    >
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
        <LayoutGrid size={13} /> Apps
      </div>
      <div className="flex-1 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-black/30 backdrop-blur-md">
        {apps.map((a) => (
          <button
            key={a.key}
            onClick={() => onOpen(a.key)}
            title={`Open ${a.label}`}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-white/5"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-surface-2 to-surface text-foreground">
              <a.icon size={14} />
            </span>
            <span className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">{a.label}</p>
              <p className="text-[10px] leading-snug text-muted">{a.desc}</p>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
