import logger from "@/lib/logger";
import { ApiErrorCode, ApiResponse } from "@/lib/api-response";

/**
 * SupersmartX API Service
 * Handles all communication with the backend API using the v1 contract.
 */

// Re-export types for use in actions
export type { ApiResponse };

interface AudioToCodeParams {
  file: File | Blob;
  api_key?: string;
  summary_provider?: "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "CUSTOM";
  code_provider?: "openai" | "claude" | "gemini" | "groq" | "custom";
  code_model?: string;
  test_provider?: "local" | "openai" | "claude" | "gemini" | "groq" | "custom";
}

interface TranscriptionResponse {
  filename: string;
  transcription: string;
  saved_as: string;
  language: string;
  language_probability: number;
}

interface SummaryResponse {
  summary: string;
  project_doc: string;
}

interface CodeGenerationResponse {
  code: string;
  language: string;
  file_path: string;
  test_output?: Record<string, unknown> | null;
}

interface TestResponse {
  success: boolean;
  output: string | null;
  error: string | null;
}

interface PlanGenerationResponse {
  plan: string;
  provider: string;
  model: string;
}

interface PromptBuildingResponse {
  prompt: string;
  provider: string;
  model: string;
  task_type: string;
  suggestions?: Record<string, unknown> | null;
}

interface CompletePipelineResponse {
  filename: string;
  transcription: string;
  summary: string;
  project_doc: string;
  code: string;
  language: string;
  file_path: string;
  test_output: Record<string, unknown> | null;
}

/**
 * Handle API errors consistently using the v1 contract
 */
function handleApiError<T>(error: unknown, path?: string): ApiResponse<T> {
  let code = ApiErrorCode.INTERNAL_ERROR;
  let message = "Unknown error occurred";
  
  if (error instanceof Error) {
    message = error.message;
    if (error.name === 'AbortError') {
      code = ApiErrorCode.SERVICE_UNAVAILABLE;
      message = "Request timed out. The AI processing might still be running in the background.";
    }
  }
  
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "v1",
      path,
    }
  };
}

/**
 * Make authenticated API request through server-side proxy or directly if on server
 */
/**
 * Base API request handler
 */
export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" = "GET",
  data?: FormData | Record<string, unknown>,
  apiKey: string = "",
  timeout: number = 300000 // Increased default to 5 minutes for AI tasks
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const isServer = typeof window === 'undefined';
  const isLocalRoute = endpoint.startsWith("/api/v1/");
  const useProxy = !isServer && !isLocalRoute;
  const path = isServer ? endpoint : (useProxy ? "/api/v1/proxy" : endpoint);

  try {
    let url: string;
    let requestOptions: RequestInit;

    if (!useProxy) {
      // Direct call to API if on server OR if it's a local route on the client
      const baseUrl = isServer 
        ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "https://api.supersmartx.com")
        : ""; // Empty base for client-side local calls to use current origin
      
      url = isLocalRoute ? endpoint : `${baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Don't set Content-Type if it's FormData, fetch will set it with boundary
      if (!(data instanceof FormData)) {
        if (data || (method !== 'GET' && method !== 'HEAD')) {
          headers["Content-Type"] = "application/json";
        }
      }

      requestOptions = {
        method,
        headers,
        body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        signal: controller.signal,
        cache: 'no-store',
      };
    } else {
      // Use proxy if on client
      url = "/api/v1/proxy";
      
      let proxyBody: FormData | string;
      const headers: Record<string, string> = {};

      if (data instanceof FormData) {
        // If data is FormData, we need to send it as FormData to the proxy
        // The proxy will then need to handle multipart/form-data
        proxyBody = new FormData();
        proxyBody.append("endpoint", endpoint);
        proxyBody.append("method", method);
        if (apiKey) proxyBody.append("apiKey", apiKey);
        
        // Append all original FormData entries
        for (const [key, value] of data.entries()) {
          proxyBody.append(`data[${key}]`, value);
        }
      } else {
        // For JSON data, keep using application/json
        headers["Content-Type"] = "application/json";
        proxyBody = JSON.stringify({
          endpoint,
          method,
          data,
          apiKey,
        });
      }

      requestOptions = {
        method: "POST",
        headers,
        credentials: "include",
        body: proxyBody,
        signal: controller.signal,
      };
    }

    const response = await fetch(url, requestOptions);
    clearTimeout(id);

    // Handle standard HTTP error statuses
    if (!response.ok) {
      let errorCode = ApiErrorCode.INTERNAL_ERROR;
      let errorMessage = `API Error: ${response.statusText}`;

      switch (response.status) {
        case 401:
          errorCode = ApiErrorCode.UNAUTHORIZED;
          errorMessage = "Session expired or invalid. Please log in again.";
          break;
        case 403:
          errorCode = ApiErrorCode.FORBIDDEN;
          errorMessage = "You don't have permission to perform this action.";
          break;
        case 404:
          errorCode = ApiErrorCode.NOT_FOUND;
          errorMessage = "The requested resource was not found.";
          break;
        case 429:
          errorCode = ApiErrorCode.RATE_LIMIT_EXCEEDED;
          errorMessage = "Too many requests. Please try again later.";
          break;
        case 503:
          errorCode = ApiErrorCode.SERVICE_UNAVAILABLE;
          errorMessage = "AI service is temporarily overloaded. Please try again in a moment.";
          break;
      }

      // Try to parse error details from response body
      let details: unknown = null;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) errorMessage = errorData.error.message;
        if (errorData.error?.details) details = errorData.error.details;
        if (errorData.error?.code) errorCode = errorData.error.code;
        
        // Enhance 500 errors with more context if generic
        if (response.status === 500 && errorMessage === `API Error: ${response.statusText}`) {
          errorMessage = "AI Service Provider Error (500). The external AI service failed to process the request.";
        }
      } catch {
        // Fallback to status text if JSON parsing fails
        if (response.status === 500) {
           errorMessage = "AI Service Connection Failed (500). Please check if the AI backend is running.";
        }
      }

      return {
        success: false,
        data: null,
        error: {
          code: errorCode,
          message: errorMessage,
          details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: "v1",
          path,
        }
      };
    }

    const result = await response.json();
    
    // Normalize response structure
    // If it's already a ApiResponse, return it
    if (
      result && 
      typeof result === 'object' && 
      'success' in result && 
      'meta' in result && 
      result.meta && 
      typeof result.meta === 'object' && 
      'version' in result.meta
    ) {
      return result as ApiResponse<T>;
    }

    // Fallback for legacy API responses that might not follow the contract yet
    const legacyResult = result as { data?: T; error?: string; message?: string };
    
    return {
      success: response.ok,
      data: (legacyResult?.data !== undefined ? legacyResult.data : result) as T,
      error: response.ok ? null : {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: legacyResult?.error || legacyResult?.message || "Request failed",
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "v1",
        path,
      }
    };

  } catch (error) {
    clearTimeout(id);
    logger.error({ error, endpoint, method }, "API request failed");
    return handleApiError<T>(error, path);
  }
}

/**
 * Complete audio-to-code pipeline
 */
export async function audioToCode(
  file: File | Blob,
  params: Partial<AudioToCodeParams> = {}
): Promise<ApiResponse<CompletePipelineResponse>> {
  const formData = new FormData();
  
  // Add filename for server-side FormData consistency
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, "audio.mp3");
  }

  if (params.api_key) formData.append("api_key", params.api_key);
  if (params.summary_provider) formData.append("summary_provider", params.summary_provider);
  if (params.code_provider) formData.append("code_provider", params.code_provider);
  if (params.code_model) formData.append("code_model", params.code_model);
  if (params.test_provider) formData.append("test_provider", params.test_provider);

  return makeApiRequest<CompletePipelineResponse>("/audio-to-code", "POST", formData);
}

/**
 * Transcribe audio file
 */
export async function transcribeAudio(
  file: File | Blob,
  apiKey: string = "",
  language?: string
): Promise<ApiResponse<TranscriptionResponse>> {
  const formData = new FormData();
  
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, "audio.mp3");
  }

  if (language) formData.append("language", language);

  return makeApiRequest<TranscriptionResponse>("/transcribe-upload", "POST", formData, apiKey);
}

/**
 * Transcribe document file (PDF, DOC, DOCX)
 */
export async function transcribeDocument(
  file: File | Blob,
  apiKey: string = "",
  language?: string
): Promise<ApiResponse<TranscriptionResponse>> {
  const formData = new FormData();
  
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, "transcript.pdf");
  }

  if (language) formData.append("language", language);

  // We use the document-specific transcription endpoint if available, 
  // or fallback to the general one which might handle multiple formats.
  return makeApiRequest<TranscriptionResponse>("/transcribe-upload", "POST", formData, apiKey);
}

/**
 * Build a prompt from text
 */
export async function buildPrompt(
  discussion_summary: string,
  options: {
    context?: string;
    api_key?: string;
    provider?: "openai" | "claude" | "gemini" | "groq" | "custom";
    model?: string;
    language?: string;
  } = {}
): Promise<ApiResponse<PromptBuildingResponse>> {
  return makeApiRequest<PromptBuildingResponse>("/build-prompt", "POST", {
    discussion_summary,
    context: options.context || null,
    api_key: options.api_key || null,
    provider: options.provider || "openai",
    model: options.model || null,
    language: options.language
  });
}

/**
 * Generate a plan from text
 */
export async function generatePlan(
  description: string,
  options: {
    api_key?: string;
    provider?: "openai" | "claude" | "gemini" | "groq" | "custom";
    model?: string;
    language?: string;
  } = {}
): Promise<ApiResponse<PlanGenerationResponse>> {
  return makeApiRequest<PlanGenerationResponse>("/generate-plan", "POST", {
    description,
    api_key: options.api_key || null,
    provider: options.provider || "openai",
    model: options.model || null,
    language: options.language
  });
}

/**
 * Summarize text
 */
export async function summarizeText(
  text: string,
  options: {
    api_key?: string;
    provider?: "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "CUSTOM";
    model?: string;
    summary_length?: string;
    summary_persona?: string;
    language?: string;
  } = {}
): Promise<ApiResponse<SummaryResponse>> {
  return makeApiRequest<SummaryResponse>("/summarize", "POST", {
    transcript: text,
    api_key: options.api_key || null,
    provider: options.provider || "OPENAI",
    model: options.model || null,
    summary_length: options.summary_length || null,
    summary_persona: options.summary_persona || null,
    language: options.language || null
  });
}

/**
 * Generate code from task description
 */
export async function generateCode(
  task: string,
  options: {
    api_key?: string;
    provider?: "openai" | "claude" | "gemini" | "groq" | "custom";
    model?: string;
  } = {}
): Promise<ApiResponse<CodeGenerationResponse>> {
  return makeApiRequest<CodeGenerationResponse>("/generate-code", "POST", {
    task,
    provider: options.provider || "openai",
    api_key: options.api_key || null,
    model: options.model || null
  });
}

/**
 * Test generated code
 */
export async function testCode(
  code: string,
  options: {
    api_key?: string;
    provider?: "local" | "openai" | "claude" | "gemini" | "groq" | "custom";
    model?: string;
  } = {}
): Promise<ApiResponse<TestResponse>> {
  return makeApiRequest<TestResponse>("/test-code", "POST", {
    code,
    provider: options.provider || "local",
    api_key: options.api_key || null,
    model: options.model || null
  });
}

/**
 * Get current model info
 */
export async function getModelInfo(): Promise<ApiResponse<Record<string, string>>> {
  return makeApiRequest<Record<string, string>>("/model-info", "GET");
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<ApiResponse<{ status: string }>> {
  return makeApiRequest<{ status: string }>("/", "GET");
}

/**
 * Download file from URL
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (typeof window === 'undefined') {
    logger.error("downloadFile is only available in the browser");
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download file");

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    logger.error({ error }, "Download failed");
    throw error;
  }
}

// Export types for better TypeScript support
export type {
  TranscriptionResponse,
  SummaryResponse,
  CodeGenerationResponse,
  TestResponse,
  CompletePipelineResponse,
  AudioToCodeParams
};
