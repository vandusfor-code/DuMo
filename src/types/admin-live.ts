import type { AdvisorPresenceStatus } from "@/lib/advisor-presence";

export interface LiveSummary {
  connectedAdvisors: number;
  leadsManagedToday: number;
  avgConnectionTimeLabel: string | null;
  teamProductivityPct: number;
  teamProductivityDeltaPct: number;
}

export interface LiveAdvisorRow {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
  presenceStatus: AdvisorPresenceStatus;
  leadsManagedToday: number;
  /** Placeholder hasta etapa 6 (advisor_sessions). */
  connectionTimeLabel: string | null;
  connectionProgressPct: number | null;
}

export interface LiveSnapshot {
  summary: LiveSummary;
  advisors: LiveAdvisorRow[];
  updatedAt: string;
}

export interface AdvisorPresenceUpdateResult {
  advisorId: string;
  presenceStatus: AdvisorPresenceStatus;
  updatedAt: string;
}
