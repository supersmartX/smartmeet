/**
 * Centralized mock data for the Supersmart application
 */

export interface TranscriptItem {
  speaker: string;
  time: string;
  text: string;
}

export interface TestResult {
  name: string;
  status: "passed" | "failed";
  duration: string;
  error?: string;
}

export interface Recording {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: "Completed" | "Processing";
}

export interface JourneyStep {
  label: string;
  status: "completed" | "pending";
}

export interface TechnicalContext {
  label: string;
  desc: string;
  status: "completed" | "pending";
  date: string;
}

export interface Stat {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  trend: string;
  href: string;
}

// Mock Transcript Data
export const mockTranscript: TranscriptItem[] = [];

// Mock Code Data
export const mockCode = "";

// Mock Test Results
export const mockTests: TestResult[] = [];

// Mock Recordings Data
export const mockRecordings: Recording[] = [];

// Mock Stats Data
export const mockStats: Stat[] = [
  { label: "Total Meetings", value: "0", icon: "Video", color: "text-brand-via", bg: "bg-brand-via/10", trend: "0%", href: "/dashboard/recordings" },
  { label: "AI Insights", value: "0", icon: "Sparkles", color: "text-amber-500", bg: "bg-amber-500/10", trend: "0%", href: "/dashboard/recordings?filter=action+items" },
  { label: "Time Saved", value: "0h", icon: "Zap", color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "0%", href: "/dashboard/recordings" },
  { label: "Compliance Score", value: "0%", icon: "ShieldCheck", color: "text-blue-500", bg: "bg-blue-500/10", trend: "0%", href: "/dashboard/recordings" },
];

// Mock Journey Steps
export const mockJourneySteps: JourneyStep[] = [];

// Mock AI Suggestions
export const mockSuggestions: string[] = [];

// Mock Technical Context
export const mockTechnicalContext: TechnicalContext[] = [];
