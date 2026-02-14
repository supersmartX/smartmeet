/**
 * Standard API Error Codes
 */
export enum ApiErrorCode {
  BAD_REQUEST = "ERR_BAD_REQUEST",
  UNAUTHORIZED = "ERR_UNAUTHORIZED",
  FORBIDDEN = "ERR_FORBIDDEN",
  NOT_FOUND = "ERR_NOT_FOUND",
  VALIDATION_ERROR = "ERR_VALIDATION",
  RATE_LIMIT_EXCEEDED = "ERR_RATE_LIMIT",
  QUOTA_EXCEEDED = "ERR_QUOTA_EXCEEDED",
  PAYLOAD_TOO_LARGE = "ERR_PAYLOAD_TOO_LARGE",
  INTERNAL_ERROR = "ERR_INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "ERR_SERVICE_UNAVAILABLE",
}

/**
 * Standard API Response Structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
    path?: string;
  };
}

/**
 * Utility to create a success response
 */
export function createSuccessResponse<T>(data: T, version: string = "v1", path?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      version,
      path,
    },
  };
}

/**
 * Utility to create an error response
 */
export function createErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  details?: unknown,
  version: string = "v1",
  path?: string
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version,
      path,
    },
  };
}

/**
 * Helper for Zod validation errors
 */
export function createValidationErrorResponse(details: unknown, version: string = "v1", path?: string): ApiResponse<null> {
  return createErrorResponse(
    ApiErrorCode.VALIDATION_ERROR,
    "Input validation failed",
    details,
    version,
    path
  );
}
