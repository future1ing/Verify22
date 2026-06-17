import type { SupabaseClient } from '@supabase/supabase-js'

export type DbCountry = 'EU' | 'MA' | 'ES'

const TABLES: Record<DbCountry, string> = { EU: 'eu_substances', MA: 'ma_products', ES: 'es_products' }

export async function searchProducts(sb: SupabaseClient, opts: {
  country: DbCountry; q?: string; filter?: string; page?: number; pageSize?: number
}) {
  const page = opts.page ?? 1, size = opts.pageSize ?? 25
  let q = sb.from(TABLES[opts.country]).select('*', { count: 'exact' })
    .order('name').range((page - 1) * size, page * size - 1)

  if (opts.q) {
    const safe = opts.q.replace(/[%,()]/g, ' ')
    q = opts.country === 'ES'
      ? q.or(`name.ilike.%${safe}%,active_ingredient.ilike.%${safe}%,holder.ilike.%${safe}%`)
      : q.ilike('name', `%${safe}%`)
  }
  if (opts.filter && opts.filter !== 'all') {
    if (opts.country === 'MA') q = q.ilike('category', `%${opts.filter}%`)
    if (opts.country === 'ES') q = q.eq('status', opts.filter === 'vigente' ? 'Vigente' : 'Cancelado')
    if (opts.country === 'EU') q = opts.filter === 'flagged' ? q.neq('flags', '{}') : q.eq('flags', '{}')
  }
  const { data, count, error } = await q
  return { rows: data ?? [], total: count ?? 0, error: error?.message ?? null }
}

export async function getEuMrls(sb: SupabaseClient, substanceId: string, limit = 50) {
  const { data } = await sb.from('eu_mrls').select('*').eq('substance_id', substanceId).limit(limit)
  return data ?? []
}
