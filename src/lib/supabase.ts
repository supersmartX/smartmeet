import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Admin client for server-side operations (Signed URLs, etc.)
export const supabaseAdmin = process.env.SUPABASE_SECRET_KEY 
  ? createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY)
  : null;
