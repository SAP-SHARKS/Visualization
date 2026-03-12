import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'your-supabase-url-here') {
  console.warn('Supabase URL not configured. Set VITE_SUPABASE_URL in .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export function isSupabaseConfigured() {
  return supabaseUrl && supabaseUrl !== 'your-supabase-url-here' &&
         supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here'
}
