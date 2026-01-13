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
- **AI Infrastructure**: Multi-provider support (OpenAI, Anthropic Claude, Google Gemini, Groq, OpenRouter)

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

## AI Pipeline Flow
The AI processing pipeline is a multi-step sequential workflow designed for robustness and observability:

1.  **Ingestion**: Audio uploaded to Supabase Storage; metadata stored in PostgreSQL.
2.  **Transcription**: Raw audio processed via Whisper (or equivalent) to generate high-fidelity text.
3.  **Summarization**: Transcription processed through selected LLM (OpenAI/Claude) to generate structured summaries and technical documentation.
4.  **Code Generation**: Key technical discussion points converted into functional code snippets.
5.  **Validation (Testing)**: Generated code is automatically passed through a testing service to verify syntactical and logical correctness.
6.  **Notification**: User is notified via internal notification system once the pipeline completes.

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
