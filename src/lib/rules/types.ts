/**
 * CORE: Rule Engine Type Definitions
 */

export enum RuleStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  DEPRECATED = "DEPRECATED",
  ARCHIVED = "ARCHIVED",
}

export enum RulePriority {
  LOW = 0,
  MEDIUM = 50,
  HIGH = 100,
  CRITICAL = 200,
}

export interface RuleMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  status: RuleStatus;
  priority: RulePriority;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export type Operator = 
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte" 
  | "in" | "nin" | "contains" | "ncontains"
  | "exists" | "nexists" | "matches";

export interface Condition {
  field: string;
  operator: Operator;
  value: unknown;
}

export interface Rule {
  metadata: RuleMetadata;
  conditions: Condition[] | { all?: Condition[]; any?: Condition[] };
  action: {
    type: string;
    params: Record<string, unknown>;
  };
  conflictStrategy?: "STOP" | "CONTINUE";
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleVersion: string;
  triggered: boolean;
  actionExecuted?: string;
  output?: unknown;
  error?: string;
}

export interface RuleEngineResponse {
  success: boolean;
  results: RuleExecutionResult[];
  context: Record<string, unknown>;
  metadata: {
    executionTimeMs: number;
    rulesProcessed: number;
    rulesTriggered: number;
  };
}
