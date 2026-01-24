# Frontend ↔ Backend API Contract

This document defines the communication contract between the frontend (Client) and the backend (API) for the SmartMeet application.

## 1. Base URL
All v1 API endpoints are prefixed with: `/api/v1`

## 2. Response Structure
All responses follow a standardized format to ensure consistency and ease of handling on the frontend.

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;       // ApiErrorCode (e.g., "UNAUTHORIZED", "VALIDATION_ERROR")
    message: string;    // Human-readable error message
    details?: unknown;  // Optional structured error details (e.g., Zod validation errors)
  } | null;
  meta: {
    timestamp: string;  // ISO timestamp
    version: string;    // API version (e.g., "v1")
    requestId?: string; // Unique ID for tracing
    path?: string;      // The API path called
  };
}
```

## 3. Error Codes
Standardized error codes are used for programmatic handling:
- `UNAUTHORIZED`: Authentication missing or invalid.
- `FORBIDDEN`: User lacks permissions for the resource.
- `NOT_FOUND`: Resource does not exist.
- `VALIDATION_ERROR`: Request body or parameters failed validation.
- `RATE_LIMIT_EXCEEDED`: Too many requests.
- `QUOTA_EXCEEDED`: User has reached their plan limits.
- `INTERNAL_SERVER_ERROR`: Generic server-side failure.

## 4. Key Endpoints

### 4.1 Proxy AI Service
`POST /api/v1/proxy`
Used for client-side AI requests while maintaining security and rate limiting.

**Request Body:**
```json
{
  "endpoint": "/api/AI/audio/process",
  "method": "POST",
  "data": { ... },
  "apiKey": "optional-user-provided-key"
}
```

### 4.2 Health Check
`GET /api/v1/health`
Returns system health status.

### 4.3 Worker Processing (Internal)
`POST /api/v1/worker/process`
Triggered by background jobs to process queued AI tasks. Requires `WORKER_SECRET` authorization.

## 5. Security & Rate Limiting
- **Authentication**: Most routes require a valid session via NextAuth.
- **Rate Limiting**: Standard limit is 10 requests per minute per IP for proxy routes.
- **SSRF Protection**: The proxy only allows specific, pre-approved downstream endpoints.

---
*Last Updated: 2026-01-19*
