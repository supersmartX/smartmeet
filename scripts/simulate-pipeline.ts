
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.supersmartx.com";

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase URL or Secret Key');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

async function runPipelineSimulation() {
  try {
    console.log('--- 1. Checking Storage ---');
    const { data: files, error: listError } = await supabaseAdmin
      .storage
      .from('recordings')
      .list();

    if (listError) {
      console.error('List Error Details:', JSON.stringify(listError, null, 2));
      throw new Error(`List failed: ${listError.message}`);
    }
    console.log(`✓ Access confirmed. Found ${files?.length || 0} files.`);
    if (files && files.length > 0) {
      console.log('Sample files:', files.slice(0, 3).map(f => f.name));
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in recordings bucket. Please upload a file first.');
      return;
    }

    let file = files?.find(f => f.name.endsWith('.txt')) || files?.[0];
    
    // If no text file, create one for testing
    if (!file) {
        console.log('No suitable test file found. Uploading one...');
        const testContent = "This is a test transcript file.";
        const { data, error } = await supabaseAdmin.storage
            .from('recordings')
            .upload('test-auto-gen.txt', testContent, { upsert: true });
        
        if (error) throw error;
        file = { name: 'test-auto-gen.txt' } as any;
    }

    if (!file) throw new Error("No file to test with");
    console.log(`Selected file: ${file.name}`);
    
    // Skip upload
    /*
    console.log('--- 1a. Uploading Test File ---');
    const testFileName = `test-pipeline-${Date.now()}.txt`;
    ...
    */


    console.log('--- 2. Downloading File ---');
    const { data: audioBlob, error: downloadError } = await supabaseAdmin
      .storage
      .from('recordings')
      .download(file.name);

    if (downloadError) {
      console.error('Download Error Details:', JSON.stringify(downloadError, null, 2));
      throw new Error(`Download failed: ${downloadError.message || 'Unknown error'}`);
    }
    console.log(`Downloaded ${audioBlob.size} bytes. Type: ${audioBlob.type}`);

    // 4. Test Summarization (Skip Transcription for Text Files)
    console.log('\n4. Testing Summarization (Directly using text file content)...');
    
    // Read the text content we just downloaded
    const textContent = await audioBlob.text();
    console.log(`Using content for summary: "${textContent.substring(0, 50)}..."`);

    // Call Summarization API
    const summaryResponse = await fetch(`${apiBaseUrl}/api/AI/audio/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            transcript: textContent,
            language: 'en'
        })
    });

    console.log(`Summary API Status: ${summaryResponse.status}`);
    if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error('Summary Error Body:', errorText);
        throw new Error(`Summary API failed with ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    console.log('✓ Summarization successful!');
    console.log('Summary Preview:', JSON.stringify(summaryData, null, 2).substring(0, 200));

    console.log('\n✅✅✅ PIPELINE VERIFICATION COMPLETE ✅✅✅');
    console.log('1. Storage Access: OK');
    console.log('2. File Download: OK');
    console.log('3. Transcription: SKIPPED (Text File)');
    console.log('4. Summarization: OK');

  } catch (error) {
    console.error('\n❌ Pipeline Failed:', error);
  }
}

runPipelineSimulation();
