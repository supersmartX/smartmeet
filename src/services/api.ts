/**
 * Supersmart API Service
 * Handles all communication with the backend API
 */

// Configuration - will be replaced with actual AWS URL when provided
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.supersmart.ai";
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AudioToCodeParams {
  file: File;
  api_key?: string;
  summary_provider?: "BART" | "GPT-4" | "CLAUDE" | "GEMINI" | "GROQ";
  code_provider?: "openai" | "claude" | "gemini" | "groq";
  test_provider?: "local" | "openai" | "claude" | "gemini" | "groq";
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
}

interface TestResponse {
  success: boolean;
  output: string;
  error: string;
}

interface CompletePipelineResponse {
  filename: string;
  transcription: string;
  summary: string;
  project_doc: string;
  code: string;
  language: string;
  file_path: string;
  test_output: TestResponse;
}

/**
 * Handle API errors consistently
 */
function handleApiError<T>(error: unknown): ApiResponse<T> {
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      message: "API request failed"
    } as ApiResponse<T>;
  }

  return {
    success: false,
    error: "Unknown error occurred",
    message: "API request failed"
  } as ApiResponse<T>;
}

/**
 * Make authenticated API request
 */
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: FormData | Record<string, unknown>,
  apiKey: string = DEFAULT_API_KEY
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (!(data instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "include",
    };

    if (data) {
      config.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP Error ${response.status}: ${response.statusText}` 
      }));
      return {
        success: false,
        error: errorData.error || response.statusText,
        message: `API request failed with status ${response.status}`
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Complete audio-to-code pipeline
 */
export async function audioToCode(
  file: File,
  params: Partial<AudioToCodeParams> = {}
): Promise<ApiResponse<CompletePipelineResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  if (params.api_key) formData.append("api_key", params.api_key);
  if (params.summary_provider) formData.append("summary_provider", params.summary_provider);
  if (params.code_provider) formData.append("code_provider", params.code_provider);
  if (params.test_provider) formData.append("test_provider", params.test_provider);

  return makeApiRequest<CompletePipelineResponse>("/audio-to-code", "POST", formData);
}

/**
 * Transcribe audio file
 */
export async function transcribeAudio(
  file: File,
  apiKey: string = DEFAULT_API_KEY
): Promise<ApiResponse<TranscriptionResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  return makeApiRequest<TranscriptionResponse>("/transcribe-upload", "POST", formData, apiKey);
}

/**
 * Summarize text
 */
export async function summarizeText(
  text: string,
  options: {
    api_key?: string;
    provider?: "BART" | "GPT-4" | "CLAUDE" | "GEMINI" | "GROQ";
  } = {}
): Promise<ApiResponse<SummaryResponse>> {
  return makeApiRequest<SummaryResponse>("/summarize", "POST", {
    transcript: text,
    api_key: options.api_key || DEFAULT_API_KEY,
    provider: options.provider || "GPT-4"
  });
}

/**
 * Generate code from task description
 */
export async function generateCode(
  task: string,
  options: {
    api_key?: string;
    provider?: "openai" | "claude" | "gemini" | "groq";
  } = {}
): Promise<ApiResponse<CodeGenerationResponse>> {
  return makeApiRequest<CodeGenerationResponse>("/generate-code", "POST", {
    task,
    provider: options.provider || "openai",
    api_key: options.api_key || DEFAULT_API_KEY
  });
}

/**
 * Test generated code
 */
export async function testCode(
  code: string,
  options: {
    api_key?: string;
    provider?: "local" | "openai" | "claude" | "gemini" | "groq";
  } = {}
): Promise<ApiResponse<TestResponse>> {
  return makeApiRequest<TestResponse>("/test-code", "POST", {
    code,
    provider: options.provider || "local",
    api_key: options.api_key || DEFAULT_API_KEY
  });
}

/**
 * Download file from URL
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
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
    console.error("Download failed:", error);
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
