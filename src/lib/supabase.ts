import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Admin client for server-side operations (Signed URLs, etc.)
export const supabaseAdmin = env.SUPABASE_SECRET_KEY 
  ? createClient(supabaseUrl, env.SUPABASE_SECRET_KEY)
  : null;
