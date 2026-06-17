import { gunzipSync } from 'zlib'

export interface MaParsed {
  id: string; name: string; holder: string; supplier: string
  category: string; formulation: string
  active_ingredients: { n: string; c: string }[]
  valid_until: string | null; toxicity_class: string
  usages: { culture: string; pest: string; dose: string; dar: string; max: string }[]
}

const clean = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const frDate = (s: string) => { const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }

/** Parse l'export ONSSA. En-têtes détectés par mots-clés (ordre tolérant). */
export function parseMA(buf: Buffer): MaParsed[] {
  const html = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('latin1') : buf.toString('latin1')
  const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
  if (!trs.length) return []

  // Détection des index de colonnes via la ligne d'en-tête
  let idx: Record<string, number> = {}
  const KEYS: [string, RegExp][] = [
    ['name', /produit/i], ['holder', /d[ée]tenteur/i], ['supplier', /fournisseur/i],
    ['reg', /homologation/i], ['valid', /valable/i], ['tox', /toxicolog/i],
    ['cat', /cat[ée]gorie/i], ['form', /formulation/i], ['ai', /mati[èe]re/i],
    ['conc', /teneur/i], ['usage', /usage|ravageur/i], ['dose', /dose/i],
    ['culture', /^culture/i], ['dar', /dar|d[ée]lai/i], ['max', /application/i],
  ]
  for (const tr of trs) {
    const cells = [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m => clean(m[1]))
    if (cells.some(c => /homologation/i.test(c))) {
      cells.forEach((c, i) => { for (const [k, re] of KEYS) if (idx[k] === undefined && re.test(c)) idx[k] = i })
      break
    }
  }
  // Fallback : ordre connu de l'export 2026
  if (idx.reg === undefined) idx = { name:0, holder:1, supplier:2, reg:3, valid:4, tox:5, cat:6, form:7, ai:8, conc:9, usage:10, dose:11, culture:12, dar:13, max:14 }

  const products = new Map<string, MaParsed>()
  for (const tr of trs) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]))
    if (tds.length < 10) continue
    const reg = tds[idx.reg] ?? ''
    if (!reg || /homologation/i.test(reg)) continue

    let p = products.get(reg)
    if (!p) {
      p = {
        id: reg, name: tds[idx.name] ?? '', holder: tds[idx.holder] ?? '', supplier: tds[idx.supplier] ?? '',
        category: tds[idx.cat] ?? '', formulation: tds[idx.form] ?? '',
        active_ingredients: [], valid_until: frDate(tds[idx.valid] ?? ''), toxicity_class: tds[idx.tox] ?? '',
        usages: [],
      }
      products.set(reg, p)
    }
    const ai = tds[idx.ai] ?? '', conc = tds[idx.conc] ?? ''
    if (ai && !p.active_ingredients.some(x => x.n === ai)) p.active_ingredients.push({ n: ai, c: conc })

    const usage = tds[idx.usage] ?? ''
    const culture = tds[idx.culture] || usage.split('/')[0] || ''
    const pest = usage.includes('/') ? usage.split('/').slice(1).join('/').trim() : usage
    if (culture || pest) p.usages.push({
      culture: culture.trim(), pest, dose: tds[idx.dose] ?? '',
      dar: tds[idx.dar] ?? '', max: tds[idx.max] ?? '',
    })
  }
  return [...products.values()]
}
