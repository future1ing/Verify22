import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export async function getProfile(sb: SupabaseClient, userId: string) {
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  return data as Profile | null
}

/** Champs modifiables par l'utilisateur (les sensibles sont protégés par trigger). */
export async function updateOwnProfile(sb: SupabaseClient, userId: string, patch: Partial<Profile>) {
  const { error } = await sb.from('profiles').update(patch).eq('id', userId)
  return { error: error?.message ?? null }
}

export async function adminListClients(admin: SupabaseClient, opts: { page?: number; pageSize?: number; q?: string } = {}) {
  const page = opts.page ?? 1, size = opts.pageSize ?? 25
  let q = admin.from('profiles').select('*', { count: 'exact' }).eq('role', 'client')
    .order('created_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (opts.q) q = q.or(`name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`)
  const { data, count, error } = await q
  return { rows: (data ?? []) as Profile[], total: count ?? 0, error: error?.message ?? null }
}
