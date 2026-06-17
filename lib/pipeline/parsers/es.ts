import * as XLSX from 'xlsx'

export interface EsParsed {
  id: string; name: string; holder: string; manufacturer: string
  active_ingredient: string; concentration: string; formulation_type: string
  status: string; expiry_date: string | null; registration_date: string | null; renewal_date: string | null
}

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const toISO = (v: unknown): string | null => {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}

export function parseES(buf: Buffer): EsParsed[] {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const hIdx = rows.findIndex(r => r.some(c => norm(c).includes('numregistro') || norm(c).includes('num registro')))
  if (hIdx < 0) return []
  const headers = rows[hIdx].map(norm)
  const col = (kw: string) => headers.findIndex(h => h.includes(kw))
  const C = {
    id: col('registro'), name: col('nombre'), holder: col('titular'), manu: col('fabricante'),
    form: col('formulado'), status: col('estado'), expiry: col('caducidad'),
    reg: col('inscrip'), renew: col('renov'),
  }

  const out: EsParsed[] = []
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    const id = String(r[C.id] ?? '').trim()
    if (!id) continue
    const formulado = String(r[C.form] ?? '')
    const fm = formulado.match(/^(.*?)\s+([\d.,]+\s*%[^[]*?)\s*(?:\[([A-Z]{2,3})\])?\s*$/)
    out.push({
      id, name: String(r[C.name] ?? '').trim(),
      holder: String(r[C.holder] ?? '').trim(), manufacturer: String(r[C.manu] ?? '').trim(),
      active_ingredient: (fm?.[1] ?? formulado).trim(),
      concentration: (fm?.[2] ?? '').trim(), formulation_type: (fm?.[3] ?? '').trim(),
      status: String(r[C.status] ?? '').trim(),
      expiry_date: C.expiry >= 0 ? toISO(r[C.expiry]) : null,
      registration_date: C.reg >= 0 ? toISO(r[C.reg]) : null,
      renewal_date: C.renew >= 0 ? toISO(r[C.renew]) : null,
    })
  }
  return out
}
