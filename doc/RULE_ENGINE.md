# Rule Engine Design Document (CORE)

## 1. Rule Philosophy
The SupersmartX Rule Engine is designed as a **declarative, deterministic, and highly observable** system for managing complex business logic. 

### Core Tenets:
- **Separation of Concerns**: Business rules are defined as data, decoupling logic from application code.
- **Immutability**: Once a rule version is activated, it is immutable. Changes require a new version.
- **Auditability**: Every rule execution is logged with its context, ensuring full traceability.
- **Performance**: Rule evaluation is optimized for low-latency execution within the request-response cycle.

## 2. Rule Lifecycle
A rule moves through several distinct states to ensure safety and governance:

1.  **DRAFT**: Initial creation. Not evaluated by the engine.
2.  **ACTIVE**: Verified and promoted. Actively evaluated by the engine.
3.  **DEPRECATED**: Scheduled for removal. Still evaluated but triggers warnings.
4.  **ARCHIVED**: Historical record. Not evaluated by the engine.

### Promotion Flow:
`DRAFT` -> (Review/Test) -> `ACTIVE` -> `DEPRECATED` -> `ARCHIVED`

## 3. Rule Versioning
Versioning follows Semantic Versioning (SemVer) principles:
- **Major**: Breaking change in rule logic or schema.
- **Minor**: New conditions or actions added in a backward-compatible way.
- **Patch**: Logic refinements or metadata updates.

The Engine always defaults to the **latest ACTIVE version** of a rule unless a specific version is requested in the context.

## 4. Conflict Resolution
When multiple rules apply to the same context, conflicts are resolved via:

1.  **Priority Scoring**: Rules are sorted and executed by `RulePriority` (0 to 200+).
2.  **Conflict Strategies**:
    - `CONTINUE`: (Default) Execute all triggered rules in priority order.
    - `STOP`: Stop execution after this rule is triggered. Prevents lower-priority rules from firing.
3.  **Isolation**: Rules cannot modify the input context during a single execution run, preventing side-effect dependencies between rules.

## 5. Determinism Guarantees
To ensure predictable outcomes across different environments:

- **Order Stability**: Rules with identical priorities are executed in alphabetical order by ID.
- **Pure Evaluation**: Condition evaluation is strictly functional; it depends only on the provided context and rule definition.
- **Time-Awareness**: If a rule depends on "now", the timestamp must be passed in the context rather than generated during evaluation.
- **RegEx Safety**: All regular expressions are validated at rule creation time to prevent ReDoS (Regular Expression Denial of Service) attacks.

## 6. Schema Structure
Rules are defined using the following TypeScript interfaces (see `src/lib/rules/types.ts`):

```typescript
interface Rule {
  metadata: RuleMetadata;    // ID, Version, Priority, Status
  conditions: Condition[];   // Field, Operator, Value
  action: RuleAction;        // Type and Parameters
  conflictStrategy: string;  // STOP or CONTINUE
}
```

## 7. Implementation Reference
- **Core Engine**: `src/lib/rules/engine.ts`
- **Type Definitions**: `src/lib/rules/types.ts`
- **Governance Integration**: `src/lib/data-governance.ts`
