import { NextRequest, NextResponse } from 'next/server'
import { apiAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { pipelineRunSchema } from '@/lib/validations'
import { parseMA, type MaParsed } from '@/lib/pipeline/parsers/ma'
import { parseES, type EsParsed } from '@/lib/pipeline/parsers/es'
import { parseEU, type EuSubstance } from '@/lib/pipeline/parsers/eu'
import { diffMA, diffES, diffEU, type DiffEvent } from '@/lib/pipeline/diff'
import { notifyUsers } from '@/lib/pipeline/notify'
import { PLAN_LIMITS, type Plan, type Severity } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 }
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n))

async function fetchAll<T>(admin: SupabaseClient, table: string, cols = '*'): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(cols).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function POST(req: NextRequest) {
  const ctx = await apiAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = pipelineRunSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { country, storagePath } = parsed.data

  const admin = createAdminClient()
  const { data: blob, error: dlErr } = await admin.storage.from('pipeline-uploads').download(storagePath)
  if (dlErr || !blob) return NextResponse.json({ error: `Download failed: ${dlErr?.message}` }, { status: 400 })
  const buf = Buffer.from(await blob.arrayBuffer())

  let events: DiffEvent[] = []
  let parsedCount = 0

  if (country === 'MA') {
    const next = parseMA(buf)
    parsedCount = next.length
    if (!parsedCount) return NextResponse.json({ error: 'Parser MA : 0 produit (format inattendu)' }, { status: 422 })
    const prevRaw = await fetchAll<any>(admin, 'ma_products')
    const prev: MaParsed[] = prevRaw.map(r => ({ ...r, active_ingredients: r.active_ingredients ?? [], usages: r.usages ?? [] }))
    events = diffMA(prev, next)
    for (const c of chunk(next.map(p => ({ ...p, updated_at: new Date().toISOString() })), 500))
      await admin.from('ma_products').upsert(c, { onConflict: 'id' })
    const gone = prev.filter(p => !next.some(n => n.id === p.id)).map(p => p.id)
    for (const c of chunk(gone, 200)) await admin.from('ma_products').delete().in('id', c)
  }

  if (country === 'ES') {
    const next = parseES(buf)
    parsedCount = next.length
    if (!parsedCount) return NextResponse.json({ error: 'Parser ES : 0 produit (en-têtes introuvables)' }, { status: 422 })
    const prev = await fetchAll<EsParsed>(admin, 'es_products')
    events = diffES(prev, next)
    for (const c of chunk(next.map(p => ({ ...p, updated_at: new Date().toISOString() })), 500))
      await admin.from('es_products').upsert(c, { onConflict: 'id' })
    const gone = prev.filter(p => !next.some(n => n.id === p.id)).map(p => p.id)
    for (const c of chunk(gone, 200)) await admin.from('es_products').delete().in('id', c)
  }

  if (country === 'EU') {
    const { substances } = parseEU(buf) // diff au niveau substances ; MRL complets via scripts/import.mjs
    parsedCount = substances.length
    if (!parsedCount) return NextResponse.json({ error: 'Parser EU : 0 substance — vérifier le mapping F dans parsers/eu.ts' }, { status: 422 })
    const prev = await fetchAll<EuSubstance & { mrl_count: number }>(admin, 'eu_substances')
    events = diffEU(prev, substances)
    for (const c of chunk(substances.map(s => ({ ...s, updated_at: new Date().toISOString() })), 500))
      await admin.from('eu_substances').upsert(c, { onConflict: 'id' })
  }

  // ── Matching clients → alertes ──
  const { data: clients } = await admin.from('profiles')
    .select('id,email,name,plan,min_severity,crops,countries_watched')
    .eq('role', 'client').eq('is_active', true)

  const alertRows: any[] = []
  const batches = new Map<string, { email: string; name: string; lines: string[] }>()

  for (const ev of events) {
    for (const c of clients ?? []) {
      const watched = (c.countries_watched || '').split(',').map((s: string) => s.trim())
      const countryOk = watched.includes(ev.country) || (ev.country === 'EU' && watched.includes('TR'))
      if (!countryOk) continue
      const allowed = PLAN_LIMITS[(c.plan ?? 'free') as Plan].severities
      if (!allowed.includes(ev.severity)) continue
      if (RANK[ev.severity] < RANK[(c.min_severity ?? 'info') as Severity]) continue
      if (ev.cultures?.length && c.crops) {
        const crops = c.crops.toLowerCase().split(',').map((s: string) => s.trim()).filter(Boolean)
        if (crops.length && !ev.cultures.some(cu => crops.some((cr: string) => cu.includes(cr) || cr.includes(cu)))) continue
      }
      alertRows.push({
        user_id: c.id, event_type: ev.event_type, severity: ev.severity,
        substance_name: ev.substance_name, product_code: ev.product_code ?? null,
        product_name: ev.product_name ?? null, old_mrl: ev.old_value ?? null, new_mrl: ev.new_value ?? null,
        regulation: ev.regulation ?? null, description: ev.description,
        country: ev.country, source: ev.source, detected_at: new Date().toISOString().slice(0, 10),
      })
      const b = batches.get(c.id) ?? { email: c.email, name: c.name, lines: [] as string[] }
      b.lines.push(ev.description)
      batches.set(c.id, b)
    }
  }
  for (const c of chunk(alertRows, 500)) await admin.from('alerts').insert(c)
  const notif = await notifyUsers(batches)

  // ── Rapport ──
  const counts = events.reduce((a, e) => { a[e.severity]++; return a }, { critical: 0, warning: 0, info: 0 })
  const reportId = `${country}_${Date.now()}`
  await admin.from('diff_reports').insert({
    report_id: reportId, country, total_changes: events.length,
    critical_count: counts.critical, warning_count: counts.warning, info_count: counts.info,
    substances_affected: new Set(events.map(e => e.substance_name)).size,
    report_data: { storagePath, parsedCount, alerts_created: alertRows.length, clients_notified: batches.size, notif, events: events.slice(0, 200) },
  })

  return NextResponse.json({
    ok: true, report_id: reportId, parsed: parsedCount,
    changes: events.length, ...counts,
    alerts_created: alertRows.length, clients_notified: batches.size, notif,
  })
}
