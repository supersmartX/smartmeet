
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase URL or Secret Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'smart-recordings';

async function createBucket() {
  console.log(`Checking for ${bucketName} bucket...`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketExists = buckets.some(b => b.name === bucketName);

  if (bucketExists) {
    console.log(`Bucket "${bucketName}" already exists.`);
    const bucket = buckets.find(b => b.name === bucketName);
    console.log('Current bucket settings:', bucket);
    
    // Update public access just in case
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      allowedMimeTypes: ['audio/*', 'video/*', 'application/pdf', 'text/plain']
    });
    
    if (updateError) {
      console.error('Error updating bucket:', updateError);
    } else {
      console.log('Bucket settings updated.');
    }
  } else {
    console.log(`Creating "${bucketName}" bucket...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      allowedMimeTypes: ['audio/*', 'video/*', 'application/pdf', 'text/plain']
    });

    if (error) {
      console.error('Error creating bucket:', error);
    } else {
      console.log('Bucket created successfully:', data);
    }
  }
}

createBucket().catch(console.error);
