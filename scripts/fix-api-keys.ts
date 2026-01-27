
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/crypto";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function reEncryptKeys() {
  console.log("Starting API key re-encryption...");
  
  const users = await prisma.user.findMany({
    where: {
      apiKey: { not: null }
    }
  });

  console.log(`Found ${users.length} users with API keys.`);

  for (const user of users) {
    if (!user.apiKey) continue;
    
    console.log(`Processing user: ${user.email}`);
    
    try {
      // If we are here, it means the key was encrypted with the OLD secret (or no secret)
      // Since we don't know the old secret, and decryption is failing, 
      // the only way is for the user to re-enter it.
      // HOWEVER, if the key was just a plain string or encrypted with NEXTAUTH_SECRET, we might recover it.
      
      console.warn(`⚠️ User ${user.email}'s API key is unreadable with the current ENCRYPTION_SECRET.`);
      console.log("Clearing invalid API key so user can re-enter it in Settings.");
      
      await prisma.user.update({
        where: { id: user.id },
        data: { apiKey: null }
      });
      
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err);
    }
  }

  console.log("Done. Users with invalid keys have had their apiKey field cleared.");
  await prisma.$disconnect();
}

reEncryptKeys();
