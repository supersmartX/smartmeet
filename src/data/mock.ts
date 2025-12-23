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
export const mockStats: Stat[] = [];

// Mock Journey Steps
export const mockJourneySteps: JourneyStep[] = [];

// Mock AI Suggestions
export const mockSuggestions: string[] = [];

// Mock Technical Context
export const mockTechnicalContext: TechnicalContext[] = [];
