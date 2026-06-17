import { XMLParser } from 'fast-xml-parser'

export interface EuSubstance { id: string; name: string; flags: string[]; regulation: string; mrl_count: number }
export interface EuMrl { substance_id: string; product_code: string; product_name: string; mrl_value: string; mrl_type: string; application_date: string }

/* ⚠️ Mapping à VÉRIFIER contre les vrais Publication*.xml.
   Le parseur scanne récursivement et accepte plusieurs noms de champs candidats. */
const F = {
  subId:   ['Substance_ID', 'substance_id', 'Pesticide_residue_ID', 'PesticideID', 'SubstanceCode', 'pest_res_id'],
  subName: ['Substance_Name', 'substance_name', 'Pesticide_residue_Name', 'PesticideName', 'pest_res_name'],
  prodCode:['Product_code', 'product_code', 'ProductCode', 'Matrix_Code', 'product_id'],
  prodName:['Product_name', 'product_name', 'ProductName', 'Matrix', 'product'],
  mrl:     ['MRL', 'mrl', 'MRL_Value', 'mrl_value', 'Value'],
  mrlType: ['MRL_Type', 'mrl_type', 'Type', 'ApplicabilityText'],
  appDate: ['Application_date', 'application_date', 'ApplicationDate', 'Applicability_date'],
  reg:     ['Regulation', 'regulation', 'Reg', 'LegalActs'],
}
const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return String(o[k]).trim()
  return ''
}

function* iterRecords(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) { for (const n of node) yield* iterRecords(n); return }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    const prim = Object.values(o).filter(v => typeof v !== 'object').length
    if (prim >= 3 && F.subName.some(k => k in o)) yield o
    for (const v of Object.values(o)) if (typeof v === 'object') yield* iterRecords(v)
  }
}

export function parseEU(buf: Buffer): { substances: EuSubstance[]; mrls: EuMrl[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: true })
  const tree = parser.parse(buf.toString('utf-8'))

  const subs = new Map<string, EuSubstance>()
  const mrls: EuMrl[] = []

  for (const r of iterRecords(tree)) {
    const name = pick(r, F.subName)
    if (!name) continue
    const id = pick(r, F.subId) || name
    let s = subs.get(id)
    if (!s) {
      const flags = [...name.matchAll(/\(([A-Z])\)/g)].map(m => m[1])
      s = { id, name, flags, regulation: pick(r, F.reg), mrl_count: 0 }
      subs.set(id, s)
    }
    const pc = pick(r, F.prodCode), pn = pick(r, F.prodName), mv = pick(r, F.mrl)
    if (pc || pn || mv) {
      mrls.push({ substance_id: id, product_code: pc, product_name: pn, mrl_value: mv, mrl_type: pick(r, F.mrlType), application_date: pick(r, F.appDate) })
      s.mrl_count++
    }
  }
  if (!subs.size) console.warn('[parseEU] 0 substance trouvée — ajuster le mapping F dans parsers/eu.ts')
  return { substances: [...subs.values()], mrls }
}
