// Shapes mirrored from the NestJS API (see backend openapi.json). Kept focused
// on what the UI renders.

export type CampaignHealth = 'healthy' | 'warning' | 'at_risk' | 'critical';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type PostStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'analyzing'
  | 'underperforming'
  | 'completed';
export type MissionStatus =
  | 'created'
  | 'planning'
  | 'executing'
  | 'evaluating'
  | 'reflecting'
  | 'awaiting_approval'
  | 'completed'
  | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface Goals {
  impressions?: number;
  clicks?: number;
  leads?: number;
  [k: string]: number | undefined;
}

export interface Campaign {
  id: string;
  missionId: string | null;
  name: string;
  objective: string;
  audience: string;
  status: CampaignStatus;
  health: CampaignHealth;
  channels: string[];
  budget: number;
  goals: Goals;
  createdAt: string;
  _count?: { posts: number; ads: number };
}

export interface PostMetrics {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

export interface MetricSnapshot {
  capturedAt: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

export interface Post {
  id: string;
  campaignId: string;
  platform: string;
  copy: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  metrics: PostMetrics | null;
  metricsHistory?: MetricSnapshot[] | null;
  aiAnalysis: Record<string, unknown> | null;
  simulation: Record<string, unknown> | null;
  approvalStatus: ApprovalStatus | null;
  createdAt: string;
  campaign?: { id: string; name: string };
}

export interface AdCampaign {
  id: string;
  campaignId: string;
  name: string;
  platform: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  derived: { ctr: number; cpc: number; cpa: number; conversionRate: number };
  campaign?: { id: string; name: string };
}

export interface SuggestionOption {
  id: string;
  label: string;
  text: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorKind: 'human' | 'agent';
  author: string;
  type: 'comment' | 'suggestion';
  body: string;
  quotedText: string | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  suggestedText: string | null;
  options: SuggestionOption[] | null;
  chosenOptionId: string | null;
  status: 'open' | 'resolved' | 'accepted' | 'rejected';
  agentRunId: string | null;
  createdAt: string;
}

export interface Mission {
  id: string;
  title: string;
  objective: string;
  status: MissionStatus;
  priority: string;
  targetMetric: { metric?: string; baseline?: number; target?: number; unit?: string };
  createdAt: string;
  _count?: { campaigns: number; agentRuns: number };
}

export interface AgentStep {
  id: string;
  order: number;
  type: string;
  label: string;
  detail: unknown;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agentType: string;
  status: string;
  summary: string | null;
  missionId: string | null;
  createdAt: string;
  steps?: AgentStep[];
  reflections?: Reflection[];
  _count?: { steps: number; recommendations: number };
}

export interface Reflection {
  id: string;
  agentType: string;
  whatWorked: string | null;
  whatFailed: string | null;
  improvement: string | null;
  reflection: string;
  score: number | null;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  agentType: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical' | 'opportunity';
  status: string;
  campaignId: string | null;
  postId: string | null;
  actions: unknown;
  createdAt: string;
  campaign?: { id: string; name: string };
}

export interface Approval {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  title: string;
  proposedAction: Record<string, unknown>;
  status: ApprovalStatus;
  feedback: string | null;
  createdAt: string;
  agentRun?: { id: string; agentType: string };
}

export interface MemoryHit {
  id: string;
  content: string;
  tags: string[];
  memoryType: string;
  fileId: string | null;
  importance: number;
  locked: boolean;
  tier: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  relevance: number;
  recency: number;
  score: number;
}

export interface FileAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string | null;
  tags: string[];
  status: string;
  importance: number;
  locked: boolean;
  text?: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface AgentHealth {
  agentType: string;
  runs: number;
  avgReflectionScore: number;
  approvalRate: number;
  rejectionRate: number;
  successRate: number;
  recommendations: number;
}

export interface LearningExample {
  id: string;
  agentType: string;
  context: string | null;
  originalOutput: string;
  editedOutput: string;
  reason: string | null;
  approvalStatus: string | null;
  createdAt: string;
}

export interface GoalProgress {
  attainment: Record<string, { actual: number; goal: number; pct: number }>;
  overallPct: number;
  health: CampaignHealth;
  actuals: { impressions: number; clicks: number; conversions: number };
}
