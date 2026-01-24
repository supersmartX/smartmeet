import { ApiResponse } from "@/lib/api-response";

/**
 * Interface for AI Processing Services
 */
export interface IAIService {
  transcribe(audioUrl: string): Promise<string>;
  summarize(text: string): Promise<{ summary: string; projectDoc: string }>;
  generateCode(prompt: string, language: string): Promise<{ code: string; filePath: string }>;
}

/**
 * Interface for Storage Services
 */
export interface IStorageService {
  uploadFile(path: string, file: Buffer | Blob, bucket: string): Promise<string>;
  getSignedUrl(path: string, bucket: string, expiresIn?: number): Promise<string>;
  deleteFile(path: string, bucket: string): Promise<void>;
}

/**
 * Interface for Meeting Management
 */
export interface IMeetingService {
  createMeeting(data: Record<string, unknown>): Promise<ApiResponse<unknown>>;
  getMeeting(id: string): Promise<ApiResponse<unknown>>;
  updateMeetingStatus(id: string, status: string): Promise<void>;
}

/**
 * Standard Error structure for LLD
 */
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}
