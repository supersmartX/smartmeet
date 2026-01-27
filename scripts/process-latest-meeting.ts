
import { PrismaClient } from "@prisma/client";
import { internalProcessMeetingAI } from "../src/actions/meeting/ai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function processLatest() {
  console.log("Fetching latest meeting to process...");
  
  const meeting = await prisma.meeting.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  if (!meeting) {
    console.error("No meetings found in database.");
    return;
  }

  console.log(`Processing meeting: ${meeting.id} (${meeting.title})`);
  console.log(`User: ${meeting.user.email}`);

  try {
    const result = await internalProcessMeetingAI(meeting.id);
    if (result.success) {
      console.log("✅ Successfully processed meeting AI!");
      console.log("Result:", JSON.stringify(result.data, null, 2));
    } else {
      console.error("❌ Failed to process meeting AI:", result.error);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

processLatest();
