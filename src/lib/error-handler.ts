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
      code: error.code,
    };
  }

  // Generic fallback for unknown errors
  logger.error({ error, ...context }, "Unhandled error in Server Action");
  
  // In development, return the actual error message for debugging
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
  const isDev = process.env.NODE_ENV === "development";

  return {
    success: false,
    error: isDev ? `Internal Error: ${errorMessage}` : "An unexpected error occurred. Please try again.",
    code: ApiErrorCode.INTERNAL_ERROR,
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
