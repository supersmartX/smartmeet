import { Rule, RulePriority, RuleStatus } from "./types";

/**
 * CORE: Meeting Governance Rules
 * Defined rules for priority, processing, and plan-based restrictions.
 */
const NOW = new Date().toISOString();

export const MEETING_GOVERNANCE_RULES: Rule[] = [
  {
    metadata: {
      id: "rule_free_plan_low_priority",
      name: "Free Plan Low Priority",
      version: "1.0.0",
      status: RuleStatus.ACTIVE,
      priority: RulePriority.HIGH,
      author: "System",
      createdAt: NOW,
      updatedAt: NOW,
      description: "FREE plan meetings have LOW processing priority"
    },
    conditions: {
      all: [
        { field: "user.plan", operator: "eq", value: "FREE" }
      ]
    },
    action: {
      type: "SET_PRIORITY",
      params: { priority: "LOW" }
    },
    conflictStrategy: "CONTINUE"
  },
  {
    metadata: {
      id: "rule_enterprise_high_priority",
      name: "Enterprise Plan High Priority",
      version: "1.0.0",
      status: RuleStatus.ACTIVE,
      priority: RulePriority.HIGH,
      author: "System",
      createdAt: NOW,
      updatedAt: NOW,
      description: "ENTERPRISE plan meetings have HIGH processing priority"
    },
    conditions: {
      all: [
        { field: "user.plan", operator: "eq", value: "ENTERPRISE" }
      ]
    },
    action: {
      type: "SET_PRIORITY",
      params: { priority: "HIGH" }
    },
    conflictStrategy: "CONTINUE"
  },
  {
    metadata: {
      id: "rule_long_meeting_tagging",
      name: "Long Meeting Tagging",
      version: "1.0.0",
      status: RuleStatus.ACTIVE,
      priority: RulePriority.MEDIUM,
      author: "System",
      createdAt: NOW,
      updatedAt: NOW,
      description: "Tag long meetings for administrative review"
    },
    conditions: {
      all: [
        { field: "meeting.isLargeFile", operator: "eq", value: true }
      ]
    },
    action: {
      type: "TAG_MEETING",
      params: { tag: "LARGE_FILE" }
    },
    conflictStrategy: "CONTINUE"
  }
];
