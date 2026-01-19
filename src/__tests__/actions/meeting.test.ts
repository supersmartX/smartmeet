import { createMeeting, deleteMeeting, updateMeetingTitle, processMeetingAI } from "@/actions/meeting";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { checkApiRateLimit, checkGeneralRateLimit } from "@/lib/rate-limit";
import { enqueueTask } from "@/lib/queue";

// Mock Dependencies
jest.mock("uuid", () => ({
  v4: jest.fn(() => "uuid-v4"),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    meeting: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/enhanced-auth", () => ({
  enhancedAuthOptions: {},
}));

jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue("127.0.0.1"),
  }),
}));

jest.mock("@/lib/crypto", () => ({
  encrypt: jest.fn((val) => `encrypted_${val}`),
  decrypt: jest.fn((val) => val.replace("encrypted_", "")),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkApiRateLimit: jest.fn(),
  checkGeneralRateLimit: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  cache: {
    delete: jest.fn().mockResolvedValue(true),
    swr: jest.fn((key, cb) => cb()),
  },
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
    },
  },
  supabaseAdmin: {
    storage: {
      from: jest.fn().mockReturnThis(),
      createSignedUrl: jest.fn(),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock("@/lib/queue", () => ({
  enqueueTask: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/actions/notification", () => ({
  createNotification: jest.fn(),
}));

jest.mock("@/lib/audit", () => ({
  logSecurityEvent: jest.fn(),
}));

describe("Meeting Actions", () => {
  const mockUser = { 
    id: "user_1", 
    email: "test@example.com",
    meetingsUsed: 0,
    meetingQuota: 10,
    plan: "FREE",
    autoProcess: true
  };
  const mockSession = { user: mockUser };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.meeting.findUnique as jest.Mock).mockResolvedValue({ 
      id: mockCuid, 
      audioUrl: "recordings/test.mp3",
      userId: mockUser.id 
    });
    (prisma.meeting.delete as jest.Mock).mockResolvedValue({ userId: mockUser.id });
    (prisma.meeting.update as jest.Mock).mockResolvedValue({ userId: mockUser.id, title: "New Title" });
    (checkApiRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (checkGeneralRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
  });

  const mockCuid = "cl0p1234567890abcdefghijkl";

  describe("createMeeting", () => {
    const validInput = {
      title: "Test Meeting",
      audioUrl: "https://example.com/audio.mp3",
      duration: "10:00",
      size: 1024 * 1024,
    };

    it("should create a meeting successfully", async () => {
      (prisma.meeting.create as jest.Mock).mockResolvedValue({ id: mockCuid, ...validInput });

      const result = await createMeeting(validInput);

      expect(result.success).toBe(true);
      expect(prisma.meeting.create).toHaveBeenCalled();
    });

    it("should fail if unauthorized", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const result = await createMeeting(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should fail on validation error", async () => {
      const invalidInput = { ...validInput, title: "" };

      const result = await createMeeting(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Title is required");
    });

    it("should respect rate limits", async () => {
      (checkApiRateLimit as jest.Mock).mockResolvedValue({ allowed: false, retryAfter: 60 });

      const result = await createMeeting(validInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit exceeded");
    });
  });

  describe("deleteMeeting", () => {
    it("should delete a meeting successfully", async () => {
      (prisma.meeting.delete as jest.Mock).mockResolvedValue({ id: mockCuid });

      const result = await deleteMeeting(mockCuid);

      expect(result.success).toBe(true);
      expect(prisma.meeting.delete).toHaveBeenCalled();
    });
  });

  describe("updateMeetingTitle", () => {
    it("should update title successfully", async () => {
      (prisma.meeting.update as jest.Mock).mockResolvedValue({ id: mockCuid, title: "New Title" });

      const result = await updateMeetingTitle(mockCuid, "New Title");

      expect(result.success).toBe(true);
      expect(prisma.meeting.update).toHaveBeenCalled();
    });
  });

  describe("processMeetingAI", () => {
    it("should enqueue AI processing task", async () => {
      const result = await processMeetingAI(mockCuid);

      expect(result.success).toBe(true);
      expect(enqueueTask).toHaveBeenCalled();
    });

    it("should fail if unauthorized", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const result = await processMeetingAI(mockCuid);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });
});
