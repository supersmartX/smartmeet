/**
 * SupersmartX API Service
 * Handles all communication with the backend API
 */

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AudioToCodeParams {
  file: File | Blob;
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
    };
  }

  return {
    success: false,
    error: "Unknown error occurred",
    message: "API request failed"
  };
}

/**
 * Make authenticated API request through server-side proxy
 */
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: FormData | Record<string, unknown>,
  apiKey: string = ""
): Promise<ApiResponse<T>> {
  try {
    // Use server-side proxy for rate limiting and security
    const proxyUrl = "/api/proxy";
    
    const proxyData = {
      endpoint,
      method,
      data: data instanceof FormData ? Object.fromEntries(data.entries()) : data,
      apiKey,
    };

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(proxyData),
    });

    const result = await response.json();
    
    // Handle rate limit errors
    if (response.status === 429) {
      return {
        success: false,
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Request failed",
        message: result.message || "API request failed",
      };
    }

    return result;
  } catch (error) {
    return handleApiError(error);
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
  file: File | Blob,
  apiKey: string = ""
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
    api_key: options.api_key || "",
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
    api_key: options.api_key || ""
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
    api_key: options.api_key || ""
  });
}

/**
 * Download file from URL
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (typeof window === 'undefined') {
    console.error("downloadFile is only available in the browser");
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
