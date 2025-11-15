import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  
  // Create a cookie-based storage adapter for Next.js
  const cookieStorage = {
    getItem: (key: string) => {
      return cookieStore.get(key)?.value ?? null
    },
    setItem: (key: string, value: string) => {
      cookieStore.set(key, value)
    },
    removeItem: (key: string) => {
      cookieStore.delete(key)
    },
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: cookieStorage,
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}