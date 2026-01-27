
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

async function createBucket() {
  console.log('Checking for recordings bucket...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketExists = buckets.some(b => b.name === 'recordings');

  if (bucketExists) {
    console.log('Bucket "recordings" already exists.');
    
    // Update public access just in case
    const { error: updateError } = await supabase.storage.updateBucket('recordings', {
      public: false,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: ['audio/*', 'video/*', 'application/pdf', 'text/plain']
    });
    
    if (updateError) {
      console.error('Error updating bucket:', updateError);
    } else {
      console.log('Bucket settings updated.');
    }
  } else {
    console.log('Creating "recordings" bucket...');
    const { data, error } = await supabase.storage.createBucket('recordings', {
      public: false,
      fileSizeLimit: 104857600, // 100MB
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
