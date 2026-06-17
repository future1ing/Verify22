import type { SupabaseClient } from '@supabase/supabase-js'
import type { Alert, AlertStats, Severity } from '@/types'

export interface AlertFilters {
  severities: Severity[]          // limites du plan
  severity?: Severity
  isRead?: boolean
  source?: string
  q?: string
  limit?: number
  offset?: number
}

export async function listAlerts(sb: SupabaseClient, userId: string, f: AlertFilters) {
  let q = sb.from('alerts').select('*', { count: 'exact' })
    .eq('user_id', userId).in('severity', f.severities)
    .order('created_at', { ascending: false })
    .range(f.offset ?? 0, (f.offset ?? 0) + (f.limit ?? 50) - 1)
  if (f.severity) q = q.eq('severity', f.severity)
  if (f.isRead !== undefined) q = q.eq('is_read', f.isRead)
  if (f.source) q = q.eq('source', f.source)
  if (f.q) {
    const safe = f.q.replace(/[%,()]/g, ' ')
    q = q.or(`substance_name.ilike.%${safe}%,description.ilike.%${safe}%,product_name.ilike.%${safe}%`)
  }
  const { data, count, error } = await q
  return { rows: (data ?? []) as Alert[], total: count ?? 0, error: error?.message ?? null }
}

export async function markRead(sb: SupabaseClient, userId: string, alertId: number) {
  return sb.from('alerts').update({ is_read: true }).eq('id', alertId).eq('user_id', userId)
}

export async function markAllRead(sb: SupabaseClient, userId: string) {
  return sb.from('alerts').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}

export async function getStats(sb: SupabaseClient, userId: string): Promise<AlertStats> {
  const { data } = await sb.rpc('get_alert_stats', { p_user_id: userId })
  return (data as AlertStats) ?? { total: 0, unread: 0, critical: 0, warning: 0, info: 0 }
}
