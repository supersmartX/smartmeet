import { ApiErrorCode, createErrorResponse } from "./api-response";
import { AppError } from "./errors";
import logger from "./logger";
import { ActionResult } from "@/types/meeting";

/**
 * Normalizes an error into a consistent ActionResult for Server Actions
 */
export function handleActionError(error: unknown, context?: Record<string, unknown>): ActionResult<never> {
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error({ error, ...context }, "Non-operational error in Server Action");
    } else {
      logger.warn({ error, ...context }, `Operational error: ${error.message}`);
    }

    return {
      success: false,
      error: error.message,
      // We could potentially add error.code here if ActionResult supported it
    };
  }

  // Generic fallback for unknown errors
  logger.error({ error, ...context }, "Unhandled error in Server Action");
  
  return {
    success: false,
    error: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

/**
 * Normalizes an error into a consistent ApiResponse for API Routes
 */
export function handleApiRouteError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof AppError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.details
    );
  }

  logger.error({ error, ...context }, "Unhandled error in API Route");

  return createErrorResponse(
    ApiErrorCode.INTERNAL_ERROR,
    error instanceof Error ? error.message : "An unexpected error occurred"
  );
}
