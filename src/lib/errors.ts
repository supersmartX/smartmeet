import { ApiErrorCode } from "./api-response";

/**
 * Base class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, code: string = ApiErrorCode.INTERNAL_ERROR, details?: unknown, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ApiErrorCode.VALIDATION_ERROR, details);
  }
}

/**
 * Error for authentication and authorization issues
 */
export class AuthError extends AppError {
  constructor(message: string = "Unauthorized", isForbidden: boolean = false) {
    super(
      message, 
      isForbidden ? ApiErrorCode.FORBIDDEN : ApiErrorCode.UNAUTHORIZED
    );
  }
}

/**
 * Error for external service failures
 */
export class ServiceError extends AppError {
  constructor(message: string, code: string = ApiErrorCode.SERVICE_UNAVAILABLE, details?: unknown) {
    super(message, code, details);
  }
}

/**
 * Error for quota or rate limit issues
 */
export class QuotaError extends AppError {
  constructor(message: string, isRateLimit: boolean = false) {
    super(
      message,
      isRateLimit ? ApiErrorCode.RATE_LIMIT_EXCEEDED : ApiErrorCode.QUOTA_EXCEEDED
    );
  }
}
