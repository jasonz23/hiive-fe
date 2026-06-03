'use client';

import type { SWRConfiguration } from 'swr';
import { useAdsControllerFindAll } from '@/swagger/generated/hiive-backend/ads/ads';
import {
  useAgentsControllerAvailable,
  useAgentsControllerGetRun,
  useAgentsControllerInsights,
  useAgentsControllerListRuns,
} from '@/swagger/generated/hiive-backend/agents/agents';
import { useApprovalsControllerList } from '@/swagger/generated/hiive-backend/approvals/approvals';
import type { ApprovalsControllerListParams } from '@/swagger/generated/hiive-backend/models';
import { useAudienceControllerGet } from '@/swagger/generated/hiive-backend/audience/audience';
import {
  useAutonomousControllerActivity,
  useAutonomousControllerStatus,
} from '@/swagger/generated/hiive-backend/autonomous/autonomous';
import {
  useCampaignsControllerFindAll,
  useCampaignsControllerFindOne,
  useCampaignsControllerSummary,
} from '@/swagger/generated/hiive-backend/campaigns/campaigns';
import { useCommentsControllerList } from '@/swagger/generated/hiive-backend/comments/comments';
import {
  useFilesControllerGet,
  useFilesControllerList,
} from '@/swagger/generated/hiive-backend/files/files';
import {
  useIntegrationsControllerCalendar,
  useIntegrationsControllerList,
} from '@/swagger/generated/hiive-backend/integrations/integrations';
import { useLearningControllerList } from '@/swagger/generated/hiive-backend/learning/learning';
import {
  useMemoryControllerStats,
  useMemoryControllerTimeline,
} from '@/swagger/generated/hiive-backend/memory/memory';
import {
  useMissionsControllerFindAll,
  useMissionsControllerFindOne,
} from '@/swagger/generated/hiive-backend/missions/missions';
import {
  usePostsControllerFindAll,
  usePostsControllerFindOne,
} from '@/swagger/generated/hiive-backend/posts/posts';
import { useRecommendationsControllerList } from '@/swagger/generated/hiive-backend/recommendations/recommendations';
import {
  useReflectionsControllerHealth,
  useReflectionsControllerList,
} from '@/swagger/generated/hiive-backend/reflections/reflections';
import type {
  AdCampaign,
  AgentHealth,
  AgentRun,
  Approval,
  Campaign,
  FileAsset,
  GoalProgress,
  LearningExample,
  MemoryHit,
  Mission,
  Post,
  PostComment,
  Recommendation,
  Reflection,
} from './types';

/**
 * Every data hook delegates to the Orval-generated SWR hook (so requests, keys,
 * and revalidation all flow through the generated client). The generated client
 * has no response DTOs in the OpenAPI contract, so it types the body as `void`;
 * we lift `.data.data` to the hand-written domain type. The `Lifted` shape keeps
 * SWR's `error`/`isLoading`/`isValidating`/`mutate` so call sites are unchanged.
 */
interface Lifted<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<unknown>;
}

interface GeneratedQuery {
  data?: { data?: unknown } | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (...args: never[]) => Promise<unknown>;
}

function lift<T>(q: GeneratedQuery): Lifted<T> {
  return {
    data: (q.data?.data as T | undefined) ?? undefined,
    error: q.error,
    isLoading: q.isLoading,
    isValidating: q.isValidating,
    mutate: () => q.mutate(),
  };
}

/** SWR options for a query that should only fire once `enabled` is true. */
const when = (enabled: boolean, extra?: SWRConfiguration) => ({ swr: { enabled, ...extra } });

export const useCampaigns = () => lift<Campaign[]>(useCampaignsControllerFindAll());
export const useCampaign = (id?: string) =>
  lift<Campaign & { posts: Post[]; ads: AdCampaign[]; recommendations: Recommendation[] }>(
    useCampaignsControllerFindOne(id ?? '', when(!!id)),
  );
export const useCampaignSummary = (id?: string) =>
  lift<{
    campaign: Campaign & { posts: Post[]; ads: AdCampaign[] };
    progress: GoalProgress;
    ai: { summary: string; highlights: string[]; risks: string[]; nextActions: string[] };
    openRecommendations: Recommendation[];
  }>(useCampaignsControllerSummary(id ?? '', when(!!id)));

export const usePosts = (campaignId?: string) =>
  lift<Post[]>(usePostsControllerFindAll(campaignId ? { campaignId } : undefined));
export const usePost = (id?: string) =>
  lift<Post & { recommendations: Recommendation[]; campaign: { id: string; name: string; goals: unknown } }>(
    usePostsControllerFindOne(id ?? '', when(!!id)),
  );

export const useAds = (campaignId?: string) =>
  lift<AdCampaign[]>(useAdsControllerFindAll(campaignId ? { campaignId } : undefined));

export const useMissions = () => lift<Mission[]>(useMissionsControllerFindAll());
export const useMission = (id?: string) =>
  lift<Mission & { campaigns: Campaign[]; agentRuns: AgentRun[] }>(
    useMissionsControllerFindOne(id ?? '', when(!!id)),
  );

export const useAgentRuns = () =>
  lift<AgentRun[]>(useAgentsControllerListRuns(undefined, { swr: { refreshInterval: 6000 } }));
export const useAgentRun = (id?: string) =>
  lift<AgentRun>(useAgentsControllerGetRun(id ?? '', when(!!id)));
export const useAgents = () => lift<{ agents: string[] }>(useAgentsControllerAvailable());
export const useAgentHealth = () => lift<AgentHealth[]>(useReflectionsControllerHealth());
export const useReflections = () => lift<Reflection[]>(useReflectionsControllerList());
export const useLearning = () => lift<LearningExample[]>(useLearningControllerList());

export const useApprovals = (status?: string) =>
  lift<Approval[]>(
    useApprovalsControllerList(status ? ({ status } as ApprovalsControllerListParams) : undefined),
  );
export const useRecommendations = () => lift<Recommendation[]>(useRecommendationsControllerList());

export interface AutonomousStatus {
  enabled: boolean;
  heartbeatEnabled: boolean;
  allOff: boolean;
  running: boolean;
  tickCount: number;
  lastTickAt: string | null;
  cadenceSeconds: number;
  pendingApprovalCap: number;
}
export interface ActivityEntry {
  at: string;
  message: string;
}
export const useAutonomousStatus = () =>
  lift<AutonomousStatus>(useAutonomousControllerStatus({ swr: { refreshInterval: 5000 } }));
export const useAutonomousActivity = () =>
  lift<ActivityEntry[]>(useAutonomousControllerActivity({ swr: { refreshInterval: 5000 } }));

export interface Integration {
  provider: string;
  label: string;
  category: string;
  categoryLabel: string;
  platform?: string | null;
  capabilities: string[];
  requires: string[];
  docsUrl?: string;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'not_implemented';
  lastSyncAt: string | null;
}
// Category display order for the integrations page.
export const INTEGRATION_CATEGORY_ORDER = [
  'crm',
  'marketing_automation',
  'analytics',
  'attribution',
  'sales_engagement',
  'bi_reporting',
  'content_calendar',
];
export const useIntegrations = () =>
  lift<Integration[]>(useIntegrationsControllerList({ swr: { refreshInterval: 8000 } }));

export interface ExternalEvent {
  id: string;
  title: string;
  date: string;
  source: string;
}
export interface CalendarSync {
  sources: {
    provider: string;
    label: string;
    connected: boolean;
    configured?: boolean;
    status?: string;
  }[];
  events: ExternalEvent[];
  hasExternalSource: boolean;
}
/** Synced view: external sources (Notion/Asana/…) + their events overlaid on the calendar. */
export const useCalendarSync = () =>
  lift<CalendarSync>(useIntegrationsControllerCalendar({ swr: { refreshInterval: 8000 } }));

export interface AudienceData {
  comments: {
    id: string;
    author: string;
    text: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    theme: string | null;
    status: 'open' | 'replied' | 'ignored';
    reply: string | null;
    createdAt: string;
    // Prospect fit — who is engaging matters more than raw volume.
    profile?: string;
    fit?: 'buy_side' | 'sell_side' | 'none';
    weight?: number;
    onSegment?: boolean;
  }[];
  quality?: {
    segment: string;
    totalCount: number;
    qualifiedCount: number;
    qualifiedScore: number;
    topProfiles: string[];
  };
  summary: {
    sentiment?: string;
    summary?: string;
    themes?: string[];
    replyOptions?: { label: string; text: string }[];
  } | null;
}
export const useAudience = (postId?: string) =>
  lift<AudienceData>(useAudienceControllerGet(postId ?? '', when(!!postId)));

export interface MemoryTimelineEntry {
  id: string;
  preview: string;
  memoryType: string;
  tags: string[];
  importance: number;
  supersededCount: number;
  locked: boolean;
  fromFile: boolean;
  createdAt: string;
}
/** Recent memory changes over time (newest first) — for the Memory timeline view. */
export const useMemoryTimeline = () =>
  lift<MemoryTimelineEntry[]>(
    useMemoryControllerTimeline({ swr: { refreshInterval: 10000 } }),
  );

export interface MarketingInsights {
  analyzedAt: string | null;
  summary: string | null;
  output: {
    baselines?: { ctr: number; convRate: number; qual: number };
    working?: { segment: string; channel: string; headline: string; detail: string }[];
    notWorking?: { segment: string; channel: string; headline: string; detail: string }[];
    filtered?: { label: string; reason: string }[];
    noiseUnits?: number;
  } | null;
}
/** Latest marketing performance analysis — what's working vs not (signal) + filtered noise. */
export const useMarketingInsights = () =>
  lift<MarketingInsights>(
    useAgentsControllerInsights({ swr: { refreshInterval: 15000 } }),
  );

export const useFiles = () => lift<FileAsset[]>(useFilesControllerList());
export const useFile = (id?: string) =>
  lift<FileAsset>(useFilesControllerGet(id ?? '', when(!!id)));
export const useComments = (postId?: string) =>
  lift<PostComment[]>(useCommentsControllerList(postId ?? '', when(!!postId)));
export const useMemoryStats = () =>
  lift<{ totalChunks: number; byType: Record<string, number> }>(useMemoryControllerStats());

export type { MemoryHit };
