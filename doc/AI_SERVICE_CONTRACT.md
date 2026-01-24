# AI Service Contract

This document defines the contract for internal and external AI services used by SmartMeet.

## 1. Overview
SmartMeet uses a modular AI pipeline for transcription, summarization, and code generation. The contract ensures that different providers (OpenAI, Claude, etc.) can be swapped or used interchangeably while maintaining a consistent interface.

## 2. Core Interfaces

### 2.1 Transcription Service
**Input:**
- `file`: Audio Blob or File
- `language`: Optional (default: auto-detect)
- `provider`: Choice of provider (e.g., "openai", "whisper-local")

**Output:**
```typescript
interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  duration?: number;
}
```

### 2.2 Summarization & Analysis
**Input:**
- `text`: Transcribed text
- `prompt`: Optional custom instructions
- `persona`: Optional persona (e.g., "Software Architect")
- `length`: "short", "medium", or "long"

**Output:**
```typescript
interface SummaryResult {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
}
```

### 2.3 Code Generation
**Input:**
- `summary`: Meeting summary
- `language`: Target programming language
- `framework`: Optional framework

**Output:**
```typescript
interface CodeResult {
  code: string;
  explanation: string;
  files: Array<{ path: string; content: string }>;
}
```

## 3. Resilience & Governance

### 3.1 Circuit Breaker
All AI service calls must be wrapped in a `RedisCircuitBreaker` to prevent cascading failures.
- **Service Name**: `ai-pipeline`
- **Failure Threshold**: 5 consecutive failures
- **Reset Timeout**: 60 seconds

### 3.2 Retry Logic
Transient errors (5xx, Rate Limits) should use exponential backoff with jitter.
- **Max Retries**: 3
- **Base Delay**: 1000ms
- **Max Delay**: 5000ms

### 3.3 Quota Management
Every AI operation must verify entitlements before execution:
1. **Feature Flag**: Check if the feature (e.g., `code_generation`) is enabled for the user's plan.
2. **Token Limit**: Track and limit monthly token usage.
3. **Daily Cap**: Enforce daily meeting/processing limits.

## 4. Error Mapping
Internal AI errors should be mapped to standardized `ApiErrorCode` values:
- Provider Rate Limit → `RATE_LIMIT_EXCEEDED`
- Provider Auth Error → `INTERNAL_SERVER_ERROR` (with logging)
- Model Timeout → `INTERNAL_SERVER_ERROR` (triggered retry)

---
*Last Updated: 2026-01-19*
