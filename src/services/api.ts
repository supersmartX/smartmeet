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
 * Make authenticated API request through server-side proxy or directly if on server
 */
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: FormData | Record<string, unknown>,
  apiKey: string = "",
  timeout: number = 300000 // Increased default to 5 minutes for AI tasks
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const isServer = typeof window === 'undefined';

  try {
    let url: string;
    let requestOptions: RequestInit;

    if (isServer) {
      // Direct call to API if on server
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "https://smartmeet-ai-x6qq.onrender.com";
      url = `${baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Don't set Content-Type if it's FormData, fetch will set it with boundary
      if (!(data instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      requestOptions = {
        method,
        headers,
        body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        signal: controller.signal,
      };
    } else {
      // Use proxy if on client
      url = "/api/proxy";
      
      // If data is FormData, we need to convert it to something JSON-serializable 
      // because our current proxy only accepts JSON. 
      // For audio files, we should really be using a multipart proxy or direct upload.
      // However, since processMeetingAI is a SERVER ACTION, it will hit the 'isServer' block above.
      
      const proxyData = {
        endpoint,
        method,
        data: data instanceof FormData ? Object.fromEntries(data.entries()) : data,
        apiKey,
      };

      requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(proxyData),
        signal: controller.signal,
      };
    }

    const response = await fetch(url, requestOptions);
    clearTimeout(id);

    // Handle rate limit errors
    if (response.status === 429) {
      return {
        success: false,
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
      };
    }

    const result = await response.json();
    
    // Normalize response structure
    // Case 1: Proxy response { success: true, data: { ... } }
    if (result.success !== undefined && result.data !== undefined && !isServer) {
      return result.data;
    }

    // Case 2: Direct API response that is already an ApiResponse
    if (result.success !== undefined) {
      return result;
    }

    // Case 3: Direct API response that is just the data
    if (response.ok) {
      return {
        success: true,
        data: result
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
  } catch (error: unknown) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: "Request timeout",
        message: `Request exceeded ${timeout / 1000} seconds`
      };
    }
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
  
  // Add filename for server-side FormData consistency
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, "audio.mp3");
  }

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
  
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, "audio.mp3");
  }

  return makeApiRequest<TranscriptionResponse>("/transcribe", "POST", formData, apiKey);
}

/**
 * Build a prompt from text
 */
export async function buildPrompt(
  text: string,
  apiKey: string = ""
): Promise<ApiResponse<{ prompt: string }>> {
  return makeApiRequest<{ prompt: string }>("/build-prompt", "POST", {
    text,
    api_key: apiKey
  });
}

/**
 * Generate a plan from text
 */
export async function generatePlan(
  text: string,
  apiKey: string = ""
): Promise<ApiResponse<{ plan: string }>> {
  return makeApiRequest<{ plan: string }>("/generate-plan", "POST", {
    text,
    api_key: apiKey
  });
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
