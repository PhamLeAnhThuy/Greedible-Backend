import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Please set env.NEXT_PUBLIC_SUPABASE_URL or env.SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase API Key. Please set env.NEXT_PUBLIC_SUPABASE_ANON_KEY or env.SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)