# Design Patterns in SmartMeet

This document provides a tutorial and cheat sheet for the design patterns used in the SmartMeet project. Understanding these patterns will help you navigate the codebase and implement new features consistently.

## **Creational Design Patterns**

Creational patterns focus on object creation mechanisms, trying to create objects in a manner suitable to the situation.

### **1. Singleton Pattern**
**Where it's used:** `src/lib/prisma.ts`
**Purpose:** Ensures that only one instance of the Prisma client exists across the entire application, preventing "too many connections" errors during development and production.
**Code Example:**
```typescript
const prismaClientSingleton = () => new PrismaClient();
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}
export const prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
```

---

## **Structural Design Patterns**

Structural patterns explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient.

### **1. Facade Pattern**
**Where it's used:** `src/lib/stripe.ts`, `src/lib/supabase.ts`
**Purpose:** Provides a simplified interface to complex external libraries. Instead of interacting with the full Stripe SDK everywhere, the app uses a few well-defined functions.
**Cheat Sheet:** Use when you want to hide the complexity of an external system or library.

### **2. Proxy Pattern**
**Where it's used:** `src/lib/circuit-breaker.ts` (the `execute` method)
**Purpose:** Acts as a wrapper around service calls to add extra functionality—in this case, fault tolerance and failure tracking.
**Cheat Sheet:** Use when you need to add logic (logging, caching, security, or fault tolerance) before or after a function call without changing the function itself.

---

## **Behavioral Design Patterns**

Behavioral patterns are concerned with algorithms and the assignment of responsibilities between objects.

### **1. State Pattern**
**Where it's used:** `src/lib/circuit-breaker.ts`
**Purpose:** Changes the behavior of the circuit breaker based on its current state (`CLOSED`, `OPEN`, `HALF_OPEN`).
**Cheat Sheet:** Use when an object's behavior depends on its state, and it must change its behavior at runtime.

### **2. Command Pattern (Server Actions)**
**Where it's used:** `src/actions/*.ts`
**Purpose:** Next.js Server Actions encapsulate a "command" (e.g., `createMeeting`, `markNotificationAsRead`) into a single function that can be called from the client but executed on the server.
**Cheat Sheet:** Use to decouple the requester (UI component) from the executor (server logic).

### **3. ActionResult Pattern (Result/Either)**
**Where it's used:** Throughout `src/actions/`
**Purpose:** A consistent return type `{ success: boolean; data?: T; error?: string }` for all server actions. This ensures predictable error handling on the client.
**Code Example:**
```typescript
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

---

## **Design Patterns Cheat Sheet: When to Use Which?**

| Pattern | Category | Use When... |
| :--- | :--- | :--- |
| **Singleton** | Creational | You need exactly one instance of a class (e.g., DB connection). |
| **Factory** | Creational | You want to centralize object creation logic. |
| **Facade** | Structural | You want to simplify a complex API or set of classes. |
| **Proxy** | Structural | You need to control access to an object or add "middleware" logic. |
| **Strategy** | Behavioral | You have multiple ways to perform a task (e.g., different AI personas). |
| **Observer** | Behavioral | One object's change should notify multiple other objects (e.g., Notifications). |
| **State** | Behavioral | An object's behavior changes significantly based on its internal status. |
| **Result** | Behavioral | You need a standardized way to return success/failure without throwing exceptions. |
