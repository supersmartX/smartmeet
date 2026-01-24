import { 
  Rule, 
  Condition, 
  RuleExecutionResult, 
  RuleEngineResponse
} from "./types";
import logger from "../logger";

/**
 * CORE: Rule Engine Implementation
 * Responsible for evaluating rules against a context and executing actions.
 */
export class RuleEngine {
  /**
   * Evaluates a single condition against the context
   */
  private static evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    const { field, operator, value } = condition;
    const contextValue = this.getNestedValue(context, field);

    switch (operator) {
      case "eq": return contextValue === value;
      case "neq": return contextValue !== value;
      case "gt": return typeof contextValue === 'number' && typeof value === 'number' && contextValue > value;
      case "gte": return typeof contextValue === 'number' && typeof value === 'number' && contextValue >= value;
      case "lt": return typeof contextValue === 'number' && typeof value === 'number' && contextValue < value;
      case "lte": return typeof contextValue === 'number' && typeof value === 'number' && contextValue <= value;
      case "in": return Array.isArray(value) && value.includes(contextValue);
      case "nin": return Array.isArray(value) && !value.includes(contextValue);
      case "contains": return typeof contextValue === "string" && typeof value === 'string' && contextValue.includes(value);
      case "ncontains": return typeof contextValue === "string" && typeof value === 'string' && !contextValue.includes(value);
      case "exists": return contextValue !== undefined && contextValue !== null;
      case "nexists": return contextValue === undefined || contextValue === null;
      case "matches": return typeof contextValue === "string" && typeof value === 'string' && new RegExp(value).test(contextValue);
      default: return false;
    }
  }

  /**
   * Safely get nested value from object using dot notation (e.g., "user.profile.id")
   */
  private static getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part: string) => 
      (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), 
      obj
    );
  }

  /**
   * Check if rule conditions are met
   */
  private static checkConditions(rule: Rule, context: Record<string, unknown>): boolean {
    const { conditions } = rule;

    if (Array.isArray(conditions)) {
      return conditions.every(c => this.evaluateCondition(c, context));
    }

    if (conditions.all) {
      return conditions.all.every(c => this.evaluateCondition(c, context));
    }

    if (conditions.any) {
      return conditions.any.some(c => this.evaluateCondition(c, context));
    }

    return false;
  }

  /**
   * Execute a set of rules against a context
   */
  public static async execute(
    rules: Rule[], 
    context: Record<string, unknown>
  ): Promise<RuleEngineResponse> {
    const startTime = Date.now();
    const results: RuleExecutionResult[] = [];
    
    // Sort rules by priority (highest first) for deterministic execution and conflict resolution
    const sortedRules = [...rules].sort((a, b) => b.metadata.priority - a.metadata.priority);

    for (const rule of sortedRules) {
      try {
        const isTriggered = this.checkConditions(rule, context);
        
        const result: RuleExecutionResult = {
          ruleId: rule.metadata.id,
          ruleVersion: rule.metadata.version,
          triggered: isTriggered,
        };

        if (isTriggered) {
          result.actionExecuted = rule.action.type;
          // In a real implementation, actions would be registered and executed here
          // For now, we record the intent
          results.push(result);

          if (rule.conflictStrategy === "STOP") {
            logger.info({ ruleId: rule.metadata.id }, "Rule conflict strategy: STOP triggered");
            break;
          }
        } else {
          results.push(result);
        }
      } catch (error) {
        logger.error({ ruleId: rule.metadata.id, error }, "Rule execution failed");
        results.push({
          ruleId: rule.metadata.id,
          ruleVersion: rule.metadata.version,
          triggered: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return {
      success: true,
      results,
      context,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        rulesProcessed: rules.length,
        rulesTriggered: results.filter(r => r.triggered).length,
      }
    };
  }
}
