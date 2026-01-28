# Technical Architecture: SupersmartX

## System Overview
SupersmartX is a high-performance meeting intelligence platform that transforms raw audio recordings into actionable technical assets, including transcripts, structured summaries, project documentation, and even functional code snippets with automated test results.

## Technology Stack
- **Frontend/Backend**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (supporting credentials, social providers, and MFA)
- **File Storage**: Supabase Storage
- **Logging**: Pino (Structured Logging)
- **Testing**: Jest
- **Caching**: Redis-backed cache layer
- **AI Infrastructure**: Multi-provider support (OpenAI, Anthropic Claude, Google Gemini, Groq)

## Core Architecture Patterns
### Layered Architecture
The project follows a clean, layered approach typical of Next.js 15 applications:
1.  **UI Layer**: React components using Tailwind CSS and Framer Motion.
2.  **Action Layer (Server Actions)**: Business logic encapsulated in Type-safe Server Actions.
3.  **Service Layer**: Specialized services for AI pipeline, mail, and external integrations.
4.  **Data Access Layer**: Prisma Client for structured data and Redis for transient state.

### Design Patterns
- **Singleton Pattern**: Used for Prisma and Redis client instances to prevent connection leakage.
- **Data Mapper Pattern**: Implemented via Prisma ORM for decoupling business logic from storage.
- **Action Result Pattern**: Consistent return types `{ success: boolean; data?: T; error?: string }` for all server operations.
- **Circuit Breaker Pattern**: Protects the AI pipeline from cascading failures during external API downtime.

## Component Responsibilities
### 1. UI Layer (Next.js Client Components)
- **Role**: Presentation and user interaction.
- **Responsibility**: State management for real-time UI updates, optimistic UI patterns, and calling Server Actions.
- **Boundaries**: No direct database or external API access; strictly communicates via Server Actions or internal API proxy.

### 2. Action Layer (Next.js Server Actions)
- **Role**: Transactional logic and security orchestration.
- **Responsibility**: Validation (Zod), Authentication (NextAuth), Rate-limiting, Audit logging, and triggering background tasks.
- **Boundaries**: Runs on the server; has full access to Prisma and Infrastructure libs.

### 3. Service Layer (AI & External Integrations)
- **Role**: Abstraction of external dependencies.
- **Responsibility**: Unified interface for multiple AI providers (OpenAI, Claude, Groq, etc.) and Stripe payment processing.
- **Boundaries**: Encapsulates external API complexities; uses Circuit Breakers for resilience.

### 4. Background Worker (Next.js API Routes + Redis)
- **Role**: Asynchronous long-running task processing.
- **Responsibility**: Dequeuing tasks, managing the sequential AI pipeline, and ensuring reliability via retry logic.
- **Boundaries**: Triggered internally or via cron; operates independently of the request-response cycle.

## Data Flow & AI Boundaries
### Data Flow Path
1.  **Upload Phase**: Audio/Documents are uploaded to **Supabase Storage**.
2.  **Registration Phase**: Metadata is saved in **PostgreSQL** via Prisma; status set to `PENDING`.
3.  **Scheduling Phase**: Task is enqueued in **Redis**; Worker is triggered via `/api/v1/worker/process`.
4.  **Intelligence Phase**: 
    - **Transcription**: External Whisper-compatible API converts audio to text.
    - **Transformation**: Text is processed via selected LLM (OpenAI/Claude) for summaries and code generation.
    - **Validation**: Generated code is tested locally or via a specialized sandbox.
5.  **Completion Phase**: Final assets are persisted; status updated to `COMPLETED`; User notified.

### AI Boundaries & Security
- **Privacy Boundary**: Sensitive user data is never sent to AI providers. Only the specific meeting content (audio/text) is processed.
- **Secret Boundary**: All AI provider API keys are encrypted at rest using AES-256-GCM. Decryption happens only in memory during the execution phase.
- **Intelligence Boundary**: AI providers are used for high-level semantic processing, while business logic, validation, and testing logic remain strictly internal to the SupersmartX backend.

## Infrastructure Resilience
- **Circuit Breakers**: Protect against external AI provider downtime.
- **Concurrency Limiting**: Prevents resource exhaustion by capping simultaneous AI operations.
- **Rate Limiting**: Multi-tier (IP, User, API) protection against abuse.

## Data Model
- **User**: Core profile, subscription status, API keys (encrypted), and security settings (MFA/IP restrictions).
- **Meeting**: Central entity tracking processing status, metadata, and associations.
- **Summary/Transcript**: Polymorphic relations to meetings containing AI-generated content.
- **ActionItem**: Extracted tasks from meetings with status tracking.
- **AuditLog/SecurityEvent**: Immutable records for compliance and security monitoring.

## Security & Compliance
- **API Key Security**: User-provided AI keys are encrypted using `AES-256-CBC` before storage.
- **Multi-Factor Authentication (MFA)**: Support for TOTP-based 2FA with recovery codes.
- **IP Restrictions**: Users can whitelist specific IPs for API-level operations.
- **Rate Limiting**: Tiered rate limiting (API vs. General) to prevent abuse.
- **Audit Trails**: Extensive logging of security events (sign-ups, password resets, MFA changes).

## Observability & Error Handling
- **Structured Logging**: Using Pino to capture context (userId, meetingId) without leaking sensitive data.
- **Error Normalization**: Unified error handling in Server Actions ensures consistent UX and easier debugging.
- **Pipeline Monitoring**: Each step of the AI pipeline (`TRANSCRIPTION`, `SUMMARIZATION`, etc.) is tracked in the database for real-time progress monitoring.

---
*Last Updated: 2026-01-13*
