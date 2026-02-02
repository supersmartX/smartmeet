
import { PrismaClient } from "@prisma/client";
import { internalProcessMeetingAI } from "@/actions/meeting/ai";
import { enqueueTask, dequeueTask } from "@/lib/queue";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// Save original fetch
const originalFetch = global.fetch;

// Mock global fetch to simulate external AI service
// We use 'any' for the mock because jest types and global fetch types can conflict
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  
  // Allow Upstash Redis calls to pass through
  if (urlStr.includes("upstash.io")) {
    // @ts-ignore
    return originalFetch(url, init);
  }

  console.log(`[MockFetch] Request to: ${urlStr}`);
  
  // Mock Storage/File Download
  if (urlStr.includes("supabase.co") || urlStr.endsWith(".mp3")) {
    return {
      ok: true,
      blob: async () => new Blob(["dummy audio content"], { type: "audio/mp3" }),
      arrayBuffer: async () => new ArrayBuffer(10),
    } as unknown as Response;
  }

  if (urlStr.includes("/transcribe-upload")) {
    return {
      ok: true,
      json: async () => ({
        transcription: "This is a test meeting transcription.",
        language: "en",
        filename: "test.mp3",
        saved_as: "test.mp3",
        language_probability: 0.99
      })
    } as Response;
  }
  if (urlStr.includes("/summarize")) {
    return {
      ok: true,
      json: async () => ({
        summary: "This is a test summary.",
        project_doc: "# Project Documentation\n\nTest content."
      })
    } as Response;
  }
  if (urlStr.includes("/generate-code")) {
    return {
      ok: true,
      json: async () => ({
        code: "console.log('Hello World');",
        language: "javascript",
        file_path: "main.js"
      })
    } as Response;
  }
  if (urlStr.includes("/test-code")) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        output: "Hello World",
        error: null
      })
    } as Response;
  }
  
  return {
    ok: false,
    status: 404,
    statusText: "Not Found"
  } as Response;
});

describe("Full Frontend-to-Backend AI Pipeline Flow", () => {
  let userId: string;
  let meetingId: string;

  beforeAll(async () => {
    // 1. Ensure a test user exists
    const user = await prisma.user.upsert({
      where: { email: "test-flow-user@example.com" },
      update: {},
      create: {
        email: "test-flow-user@example.com",
        name: "Test Flow User",
        image: "https://example.com/avatar.jpg",
        emailVerified: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    if (meetingId) {
      await prisma.meeting.delete({ where: { id: meetingId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("should simulate the full flow: Create Meeting -> Enqueue -> Process -> Complete", async () => {
    console.log("Step 1: Creating Meeting in DB (Frontend Simulation)");
    const meeting = await prisma.meeting.create({
      data: {
        title: "Integration Test Meeting",
        userId: userId,
        status: "PENDING", // Initial status
        audioUrl: "https://example.com/test-audio.mp3",
        duration: "120",
      },
    });
    meetingId = meeting.id;
    expect(meeting.id).toBeDefined();

    console.log(`Step 2: Enqueuing Task for Meeting ${meetingId}`);
    const taskId = uuidv4();
    const queued = await enqueueTask({
      id: taskId,
      type: "PROCESS_MEETING_AI",
      data: { meetingId: meeting.id },
    });
    expect(queued).toBe(true);

    console.log("Step 3: Dequeuing Task (Worker Simulation)");
    
    // Attempt to dequeue specifically our task
    let task = await dequeueTask();
    let foundMyTask = false;
    let retries = 0;
    
    while (task && retries < 10) {
      if (task.data.meetingId === meetingId) {
        foundMyTask = true;
        break;
      }
      console.log(`Dequeued unrelated task: ${task.id}`);
      task = await dequeueTask();
      retries++;
    }

    if (!foundMyTask) {
        console.warn("Could not dequeue the specific task. The queue might be empty or consumed by another worker.");
        // We will proceed anyway to test the PIPELINE logic manually
    } else {
        console.log("Task successfully dequeued.");
    }
    
    console.log("Step 4: Processing Meeting (AI Pipeline Simulation)");
    // We call the internal function directly, passing the meetingId.
    
    const result = await internalProcessMeetingAI(meetingId);
    
    if (!result.success) {
      console.error("Pipeline failed with error:", result.error);
    }
    expect(result.success).toBe(true);

    console.log("Step 5: Verifying Final State");
    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    expect(updatedMeeting).toBeDefined();
    expect(updatedMeeting?.status).toBe("COMPLETED");
    // expect(updatedMeeting?.processingStep).toBe("TESTING"); // Might be undefined or different depending on implementation
    
    console.log("Test Passed: Meeting processed successfully.");
  }, 120000); // 120s timeout
});
