# Product Surfaces & Use-Case Design

This document outlines the primary product surfaces of SmartMeet and the key use cases they serve.

## **1. Marketing Surface (Landing Page)**
*   **Path:** `/`
*   **Purpose:** User acquisition and product education.
*   **Key Use Cases:**
    *   View product value proposition (AI summaries, action items).
    *   Explore pricing plans.
    *   Sign up / Log in.

## **2. Dashboard Surface (Overview)**
*   **Path:** `/dashboard`
*   **Purpose:** High-level summary of user activity and meeting health.
*   **Key Use Cases:**
    *   Monitor total meetings and AI insights generated.
    *   Track time saved via AI automation.
    *   Quick access to recent recordings.

## **3. Recordings Surface (Core Workflow)**
*   **Path:** `/dashboard/recordings`
*   **Purpose:** The central hub for meeting data and AI output.
*   **Key Use Cases:**
    *   Upload and manage meeting recordings.
    *   View AI-generated summaries and transcripts.
    *   Extract and track action items.
    *   Search through historical meeting data.

## **4. Integrations Surface (Connectivity)**
*   **Path:** `/dashboard/integrations`
*   **Purpose:** Connecting SmartMeet to the user's existing ecosystem.
*   **Key Use Cases:**
    *   Connect/Disconnect Google Calendar / Outlook.
    *   Manage browser extension settings.
    *   Configure webhooks for external automation.

## **5. Security & MFA Surface**
*   **Path:** `/dashboard/security`
*   **Purpose:** Account protection and compliance.
*   **Key Use Cases:**
    *   Enable/Disable Multi-Factor Authentication (TOTP).
    *   Generate and manage recovery codes.
    *   Monitor account access logs.

## **6. Team Surface (Collaboration)**
*   **Path:** `/dashboard/team`
*   **Purpose:** Organization-level management.
*   **Key Use Cases:**
    *   Invite team members.
    *   Manage role-based access control (Admin/Member).
    *   View team-wide meeting statistics.

## **7. Settings Surface (Personalization)**
*   **Path:** `/dashboard/settings`
*   **Purpose:** Fine-tuning the SmartMeet experience.
*   **Key Use Cases:**
    *   Update profile information.
    *   Configure AI personas (e.g., Executive vs. Technical summaries).
    *   Manage billing and subscription plans.
