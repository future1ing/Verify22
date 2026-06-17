import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PLAN_PRICES, type Plan } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [
    { count: totalClients },
    { count: activeClients },
    { count: totalAlerts },
    { count: criticalAlerts },
    { data: planRows },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client').eq('is_active', true),
    admin.from('alerts').select('*', { count: 'exact', head: true }),
    admin.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
    admin.from('profiles').select('plan').eq('role', 'client'),
  ])

  const planCounts = (planRows || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.plan] = (acc[r.plan] || 0) + 1; return acc
  }, {})
  const mrr = (planRows || []).reduce((s, r) => s + (PLAN_PRICES[r.plan as Plan] || 0), 0)

  return NextResponse.json({
    total_clients: totalClients || 0,
    active_clients: activeClients || 0,
    total_alerts: totalAlerts || 0,
    critical_alerts: criticalAlerts || 0,
    plan_distribution: planCounts,
    mrr_estimate: mrr,
  })
}
