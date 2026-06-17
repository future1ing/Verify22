#!/usr/bin/env node
/* Import des bases parsées vers Supabase (à lancer en LOCAL, une fois).
   Usage :
     node scripts/import.mjs --ma ./ma_onssa_database.json --es ./es_mapa_database.json --eu ./eu_mrl_agent_db.json
   Lit NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY depuis .env.local */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

if (existsSync('.env.local'))
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local)'); process.exit(1) }
const sb = createClient(url, key)

const args = process.argv.slice(2)
const arg = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null }
const iso = s => { if (!s) return null; const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; return /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? String(s).slice(0, 10) : null }
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n))

async function upsert(table, rows, size = 500) {
  let done = 0
  for (const c of chunk(rows, size)) {
    const { error } = await sb.from(table).upsert(c, { onConflict: 'id' })
    if (error) { console.error(`\n❌ ${table}:`, error.message); process.exit(1) }
    done += c.length; process.stdout.write(`\r   ${table}: ${done}/${rows.length}`)
  }
  console.log(' ✅')
}

const maPath = arg('ma')
if (maPath) {
  const db = JSON.parse(readFileSync(maPath, 'utf8'))
  const rows = (db.products ?? db).map(p => ({
    id: String(p.product_id ?? p.id), name: p.product_name ?? p.name ?? '',
    holder: p.holder ?? '', supplier: p.supplier ?? '',
    category: p.category ?? '', formulation: p.formulation ?? '',
    active_ingredients: (p.active_ingredients ?? []).map(a => ({ n: a.name ?? a.n ?? '', c: a.concentration ?? a.c ?? '' })),
    valid_until: iso(p.valid_until), toxicity_class: p.toxicity_class ?? '',
    usages: (p.usages ?? []).map(u => ({
      culture: u.culture ?? '', pest: u.pest ?? '', dose: u.dose ?? '',
      dar: String(u.pre_harvest_interval_days ?? u.dar ?? ''), max: String(u.max_applications ?? u.max ?? ''),
    })),
  }))
  console.log(`🇲🇦 MA : ${rows.length} produits`)
  await upsert('ma_products', rows)
}

const esPath = arg('es')
if (esPath) {
  const db = JSON.parse(readFileSync(esPath, 'utf8'))
  const rows = (db.products ?? db).map(p => ({
    id: String(p.product_id ?? p.id), name: p.product_name ?? p.name ?? '',
    holder: p.holder ?? '', manufacturer: p.manufacturer ?? '',
    active_ingredient: p.active_ingredient ?? '', concentration: p.concentration ?? '',
    formulation_type: p.formulation_type ?? '', status: p.status ?? '',
    expiry_date: iso(p.expiry_date), registration_date: iso(p.registration_date), renewal_date: iso(p.renewal_date),
  }))
  console.log(`🇪🇸 ES : ${rows.length} produits`)
  await upsert('es_products', rows)
}

const euPath = arg('eu')
if (euPath) {
  console.log('🇪🇺 EU : lecture du fichier (84MB, ~10s)…')
  const db = JSON.parse(readFileSync(euPath, 'utf8'))
  const index = db.index_by_substance_id ?? db
  const subs = [], mrls = []
  for (const [id, s] of Object.entries(index)) {
    subs.push({ id, name: s.substance_name ?? s.name ?? id, flags: s.flags ?? [], regulation: s.regulation ?? '', mrl_count: (s.products ?? []).length })
    for (const p of s.products ?? [])
      mrls.push({ substance_id: id, product_code: String(p.product_code ?? ''), product_name: p.product_name ?? '', mrl_value: String(p.mrl_raw ?? p.mrl ?? ''), mrl_type: p.mrl_type ?? '', application_date: String(p.application_date ?? '') })
  }
  console.log(`   ${subs.length} substances, ${mrls.length} LMR`)
  await upsert('eu_substances', subs)
  console.log('   purge eu_mrls…')
  await sb.from('eu_mrls').delete().gte('id', 0)
  let done = 0
  for (const c of chunk(mrls, 1000)) {
    const { error } = await sb.from('eu_mrls').insert(c)
    if (error) { console.error('\n❌ eu_mrls:', error.message); process.exit(1) }
    done += c.length; process.stdout.write(`\r   eu_mrls: ${done}/${mrls.length}`)
  }
  console.log(' ✅')
}
console.log('\n🎉 Import terminé')
