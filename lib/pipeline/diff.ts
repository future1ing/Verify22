import type { Severity } from '@/types'
import type { MaParsed } from './parsers/ma'
import type { EsParsed } from './parsers/es'
import type { EuSubstance } from './parsers/eu'

export interface DiffEvent {
  event_type: string; severity: Severity; country: string; source: string
  substance_name: string; product_code?: string; product_name?: string
  old_value?: string; new_value?: string; regulation?: string
  description: string; cultures?: string[]
}

const DAY = 86400000
const daysUntil = (iso: string | null) => iso ? Math.floor((new Date(iso).getTime() - Date.now()) / DAY) : null

/* ─── MAROC (ONSSA) ─────────────────────────────────────────── */
export function diffMA(oldRows: MaParsed[], newRows: MaParsed[]): DiffEvent[] {
  const ev: DiffEvent[] = []
  const o = new Map(oldRows.map(r => [r.id, r])), n = new Map(newRows.map(r => [r.id, r]))
  const src = { country: 'MA', source: 'ONSSA' }
  const sub = (p: MaParsed) => p.active_ingredients[0]?.n || p.name

  for (const [id, np] of n) {
    const op = o.get(id)
    const cult = np.usages.map(u => u.culture.toLowerCase()).filter(Boolean)
    if (!op) {
      if (oldRows.length) ev.push({ ...src, event_type: 'NEW_PRODUCT', severity: 'info', substance_name: sub(np), product_name: np.name, product_code: id, description: `Nouveau produit homologué : ${np.name} (${np.category})`, cultures: cult })
      continue
    }
    if (op.valid_until !== np.valid_until)
      ev.push({ ...src, event_type: 'VALIDITY_CHANGE', severity: 'warning', substance_name: sub(np), product_name: np.name, product_code: id, old_value: op.valid_until ?? '—', new_value: np.valid_until ?? '—', description: `Validité modifiée pour ${np.name} : ${op.valid_until ?? '—'} → ${np.valid_until ?? '—'}`, cultures: cult })

    const ok = new Map(op.usages.map(u => [`${u.culture}|${u.pest}`.toLowerCase(), u]))
    for (const u of np.usages) {
      const key = `${u.culture}|${u.pest}`.toLowerCase()
      const ou = ok.get(key)
      if (!ou) ev.push({ ...src, event_type: 'NEW_USAGE', severity: 'info', substance_name: sub(np), product_name: np.name, product_code: id, description: `Nouvel usage : ${np.name} sur ${u.culture}${u.pest ? ' / ' + u.pest : ''}`, cultures: [u.culture.toLowerCase()] })
      else if (ou.dose !== u.dose && u.dose)
        ev.push({ ...src, event_type: 'DOSE_CHANGE', severity: 'warning', substance_name: sub(np), product_name: np.name, product_code: id, old_value: ou.dose, new_value: u.dose, description: `Dose modifiée : ${np.name} sur ${u.culture} — ${ou.dose} → ${u.dose}`, cultures: [u.culture.toLowerCase()] })
    }
    const nk = new Set(np.usages.map(u => `${u.culture}|${u.pest}`.toLowerCase()))
    for (const [key, ou] of ok) if (!nk.has(key))
      ev.push({ ...src, event_type: 'USAGE_REMOVED', severity: 'warning', substance_name: sub(np), product_name: np.name, product_code: id, description: `Usage retiré : ${np.name} sur ${ou.culture}`, cultures: [ou.culture.toLowerCase()] })
  }
  for (const [id, op] of o) if (!n.has(id))
    ev.push({ ...src, event_type: 'WITHDRAWAL', severity: 'critical', substance_name: sub(op), product_name: op.name, product_code: id, description: `Produit RETIRÉ de l'index ONSSA : ${op.name}`, cultures: op.usages.map(u => u.culture.toLowerCase()) })

  for (const np of newRows.length ? n.values() : []) {
    const d = daysUntil(np.valid_until)
    if (d !== null && d >= 0 && d <= 90)
      ev.push({ ...src, event_type: 'EXPIRY_WARNING', severity: d <= 30 ? 'critical' : 'warning', substance_name: sub(np), product_name: np.name, product_code: np.id, new_value: np.valid_until!, description: `Homologation de ${np.name} expire dans ${d} jours (${np.valid_until})`, cultures: np.usages.map(u => u.culture.toLowerCase()) })
  }
  return ev
}

/* ─── ESPAGNE (MAPA) ────────────────────────────────────────── */
export function diffES(oldRows: EsParsed[], newRows: EsParsed[]): DiffEvent[] {
  const ev: DiffEvent[] = []
  const o = new Map(oldRows.map(r => [r.id, r])), n = new Map(newRows.map(r => [r.id, r]))
  const src = { country: 'ES', source: 'MAPA' }

  for (const [id, np] of n) {
    const op = o.get(id)
    if (!op) {
      if (oldRows.length) ev.push({ ...src, event_type: 'NEW_PRODUCT', severity: 'info', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: id, description: `Nouveau produit au registre : ${np.name}` })
      continue
    }
    if (op.status === 'Vigente' && np.status === 'Cancelado')
      ev.push({ ...src, event_type: 'CANCELLATION', severity: 'critical', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: id, old_value: 'Vigente', new_value: 'Cancelado', description: `Produit ANNULÉ au registre MAPA : ${np.name}` })
    if (op.status === 'Cancelado' && np.status === 'Vigente')
      ev.push({ ...src, event_type: 'REACTIVATION', severity: 'info', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: id, description: `Produit réactivé : ${np.name}` })
    if (op.expiry_date !== np.expiry_date)
      ev.push({ ...src, event_type: 'DATE_CHANGE', severity: 'warning', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: id, old_value: op.expiry_date ?? '—', new_value: np.expiry_date ?? '—', description: `Date d'expiration modifiée : ${np.name} — ${op.expiry_date ?? '—'} → ${np.expiry_date ?? '—'}` })
    if (op.holder !== np.holder && np.holder)
      ev.push({ ...src, event_type: 'HOLDER_CHANGE', severity: 'info', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: id, old_value: op.holder, new_value: np.holder, description: `Changement de titulaire : ${np.name}` })
  }
  for (const np of n.values()) {
    if (np.status !== 'Vigente') continue
    const d = daysUntil(np.expiry_date)
    if (d !== null && d >= 0 && d <= 90)
      ev.push({ ...src, event_type: 'EXPIRY_WARNING', severity: d <= 30 ? 'critical' : 'warning', substance_name: np.active_ingredient || np.name, product_name: np.name, product_code: np.id, new_value: np.expiry_date!, description: `${np.name} expire dans ${d} jours (${np.expiry_date})` })
  }
  return ev
}

/* ─── EU (niveau substances) ────────────────────────────────── */
export function diffEU(oldRows: EuSubstance[], newRows: EuSubstance[]): DiffEvent[] {
  const ev: DiffEvent[] = []
  const o = new Map(oldRows.map(r => [r.id, r])), n = new Map(newRows.map(r => [r.id, r]))
  const src = { country: 'EU', source: 'EU_Commission' }

  for (const [id, ns] of n) {
    const os = o.get(id)
    if (!os) { if (oldRows.length) ev.push({ ...src, event_type: 'NEW_SUBSTANCE', severity: 'info', substance_name: ns.name, regulation: ns.regulation, description: `Nouvelle substance : ${ns.name}` }); continue }
    const gained = ns.flags.filter(f => !os.flags.includes(f))
    if (gained.length)
      ev.push({ ...src, event_type: 'FLAG_CHANGE', severity: 'critical', substance_name: ns.name, old_value: os.flags.join(','), new_value: ns.flags.join(','), regulation: ns.regulation, description: `Flag(s) ajouté(s) sur ${ns.name} : (${gained.join(') (')})` })
    if (os.regulation !== ns.regulation && ns.regulation)
      ev.push({ ...src, event_type: 'REG_CHANGE', severity: 'info', substance_name: ns.name, old_value: os.regulation, new_value: ns.regulation, regulation: ns.regulation, description: `Règlement mis à jour pour ${ns.name}` })
  }
  for (const [id, os] of o) if (!n.has(id))
    ev.push({ ...src, event_type: 'SUBSTANCE_REMOVED', severity: 'critical', substance_name: os.name, regulation: os.regulation, description: `Substance RETIRÉE de la base EU : ${os.name}` })
  return ev
}
