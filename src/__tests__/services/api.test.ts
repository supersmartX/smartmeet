import { transcribeAudio, transcribeDocument } from "@/services/api";

// Mock fetch globally
global.fetch = jest.fn();

describe("API Service", () => {
  const mockFile = new File(["test content"], "test.mp3", { type: "audio/mpeg" });
  const mockDoc = new File(["test content"], "test.pdf", { type: "application/pdf" });
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          transcription: "Mocked transcription text",
          filename: "test.mp3"
        }
      })
    });
  });

  describe("transcribeAudio", () => {
    it("should successfully transcribe audio when API returns success", async () => {
      const result = await transcribeAudio(mockFile, mockApiKey);

      expect(result.success).toBe(true);
      expect(result.data?.transcription).toBe("Mocked transcription text");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/AI/audio/transcribe"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
    });

    it("should handle API failure correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: "Internal Server Error",
          message: "Something went wrong"
        })
      });

      const result = await transcribeAudio(mockFile, mockApiKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal Server Error");
    });

    it("should handle rate limit errors (429)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({})
      });

      const result = await transcribeAudio(mockFile, mockApiKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate limit exceeded");
    });
  });

  describe("transcribeDocument", () => {
    it("should successfully transcribe a document", async () => {
      const result = await transcribeDocument(mockDoc, mockApiKey);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/AI/document/transcribe"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
    });

    it("should handle document transcription failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: "Unsupported file format"
        })
      });

      const result = await transcribeDocument(mockDoc, mockApiKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unsupported file format");
    });
  });
});
