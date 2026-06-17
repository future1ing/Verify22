import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')
  return { supabase, user, profile: profile as Profile }
}

/** Pour les route handlers — retourne null au lieu de rediriger */
export async function apiUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { supabase, user } : null
}

export async function apiAdmin() {
  const ctx = await apiUser()
  if (!ctx) return null
  const { data: profile } = await ctx.supabase.from('profiles').select('*').eq('id', ctx.user.id).single()
  if (!profile || profile.role !== 'admin') return null
  return { ...ctx, profile: profile as Profile }
}
