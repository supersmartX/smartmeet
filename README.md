# SupersmartX AI - Meeting Intelligence

AI-Powered Meeting Intelligence platform for capturing, transcribing, and summarizing your meetings.

## 🚀 Features

- **Next.js 15 (App Router)**: High-performance React framework.
- **Authentication**: Secure login with NextAuth.js (Google, GitHub, and Credentials).
- **Database**: Prisma ORM with PostgreSQL (Supabase).
- **Security**: 
  - Password hashing with Bcrypt.
  - Account lockout after 5 failed attempts.
  - Audit logging for security events.
  - Zod schema validation for all inputs and environment variables.
- **Styling**: Tailwind CSS with Dark Mode support.

## 🛠️ Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Set up Environment Variables**:
    Create a `.env` file based on the required schema in `src/lib/env.ts`.

3.  **Sync Database**:
    ```bash
    npx prisma db push
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🛡️ Security Audit & Roadmap (December 2025)

The project has undergone a professional security audit and is currently **Production Ready**.

### Current Security Implementation
- ✅ **Brute Force Protection**: Automatic 15-minute account lockout after 5 failed login attempts.
- ✅ **Audit Logs**: Every login (success/fail/locked) is recorded in the `AuditLog` table.
- ✅ **Type Safety**: Full TypeScript implementation with strict mode enabled.
- ✅ **Input Sanitization**: All user data is validated via Zod before hitting the database.

### 📈 Future Recommendations (Roadmap)
To transition from a professional MVP to an Enterprise-grade platform (SOC2/Compliance ready), the following enhancements are recommended:

1.  **Multi-Factor Authentication (MFA)**: Implement TOTP (Authenticator App) support to prevent account takeovers.
2.  **Auth Architecture Refactor**: Move `authOptions` from the route handler to `src/lib/auth.ts` for cleaner imports in Server Actions.
3.  **API Key Hashing**: Transition from plain-text API key storage to hashed storage (similar to passwords).
4.  **Security Activity Dashboard**: Build a UI for users to view their own `AuditLog` history and active sessions.
5.  **Role-Based Access Control (RBAC)**: Fully implement the `UserRole` (ADMIN, MEMBER, VIEWER) logic across all dashboard routes.

---
Built with ❤️ by the SupersmartX Team.
