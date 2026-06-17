import { NextRequest, NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { alertsQuerySchema, alertsPatchSchema } from '@/lib/validations'
import { listAlerts, markAllRead, markRead } from '@/lib/data/alerts'
import { PLAN_LIMITS, type Plan } from '@/types'
import { z } from 'zod'

const queryWithCountry = alertsQuerySchema.extend({ country: z.string().max(5).optional() })

export async function GET(req: NextRequest) {
  const ctx = await apiUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await checkRateLimit(`alerts:${ctx.user.id}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = queryWithCountry.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const f = parsed.data

  const { data: profile } = await ctx.supabase.from('profiles').select('plan').eq('id', ctx.user.id).single()
  const plan = (profile?.plan ?? 'free') as Plan
  const allowed = PLAN_LIMITS[plan].severities

  let { rows, total, error } = await listAlerts(ctx.supabase, ctx.user.id, {
    severities: allowed,
    severity: f.severity && allowed.includes(f.severity) ? f.severity : undefined,
    isRead: f.is_read === undefined ? undefined : f.is_read === 'true',
    source: f.source, q: f.q, limit: f.limit, offset: f.offset,
  })
  if (f.country) rows = rows.filter(r => r.country === f.country)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ alerts: rows, total, plan, allowed_severities: allowed })
}

export async function PATCH(req: NextRequest) {
  const ctx = await apiUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await checkRateLimit(`alerts-w:${ctx.user.id}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = alertsPatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (parsed.data.read_all) await markAllRead(ctx.supabase, ctx.user.id)
  else if (parsed.data.alert_id) await markRead(ctx.supabase, ctx.user.id, parsed.data.alert_id)
  return NextResponse.json({ ok: true })
}
