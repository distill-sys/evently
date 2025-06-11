
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL not found. Please check your .env file.");
}

if (!supabaseAnonKey) {
  throw new Error("Supabase anon key not found. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
