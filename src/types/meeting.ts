export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration?: string;
  participants?: number;
  status: string;
  userId: string;
  code?: string;
  projectDoc?: string;
  testResults?: string;
  audioUrl?: string;
}

export interface MeetingWithRelations extends Meeting {
  transcripts: Transcript[];
  summary?: Summary;
  actionItems: ActionItem[];
}

export interface Transcript {
  id: string;
  speaker: string;
  time: string;
  text: string;
  meetingId: string;
}

export interface Summary {
  id: string;
  content: string;
  meetingId: string;
}

export interface ActionItem {
  id: string;
  title: string;
  status: "PENDING" | "COMPLETED" | "IN_PROGRESS" | "CANCELLED";
  meetingId: string;
}

export interface MeetingUpdateData {
  transcription?: string;
  summary?: string;
  code?: string;
  projectDoc?: string;
  testResults?: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  trend: string;
  href: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface UserWithMeetings {
  id: string;
  email: string;
  _count: {
    meetings: number;
  };
  meetings: Array<{
    id: string;
    _count: {
      actionItems: number;
    };
    summary?: Summary;
  }>;
}

export interface UserSettings {
  apiKey: string | null;
  apiKeys?: Record<string, string>;
  preferredProvider: string | null;
  preferredModel: string | null;
  allowedIps: string;
  lastUsedAt: Date | null;
  name: string | null;
  email: string | null;
  image: string | null;
  mfaEnabled: boolean;
}
