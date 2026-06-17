'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

type Country = 'EU' | 'MA' | 'ES'
const FILTERS: Record<Country, { id: string; label: string }[]> = {
  EU: [{ id: 'all', label: 'Toutes' }, { id: 'flagged', label: '🚩 Avec flags' }],
  MA: [{ id: 'all', label: 'Toutes' }, { id: 'insecticide', label: 'Insecticides' }, { id: 'fongicide', label: 'Fongicides' }, { id: 'herbicide', label: 'Herbicides' }],
  ES: [{ id: 'all', label: 'Tous' }, { id: 'vigente', label: '✅ Vigente' }, { id: 'cancelado', label: '❌ Cancelado' }],
}

export default function DatabasesPage() {
  const t = useTranslations('admin')
  const [country, setCountry] = useState<Country>('MA')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ rows: any[]; total: number }>({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ country, page: String(page), filter })
    if (q.trim()) p.set('q', q.trim())
    const r = await fetch('/api/admin/databases?' + p).then(r => r.json()).catch(() => null)
    if (r?.rows) setData({ rows: r.rows, total: r.total }); else setData({ rows: [], total: 0 })
    setLoading(false)
  }, [country, filter, q, page])

  useEffect(() => { const id = setTimeout(load, q ? 300 : 0); return () => clearTimeout(id) }, [load, q])
  useEffect(() => { setPage(1); setFilter('all') }, [country])

  const pages = Math.max(1, Math.ceil(data.total / 25))

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx mb-1">{t('dbTitle')}</h2>
      <p className="text-xs text-tx2 mb-5">{t('dbHint')}</p>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {(['MA', 'ES', 'EU'] as Country[]).map(c => (
          <button key={c} onClick={() => setCountry(c)}
            className={clsx('px-3.5 py-2 rounded-lg text-sm border transition-all', country === c ? 'bg-accent/15 border-accent text-accent' : 'border-bdr text-tx2 hover:text-tx')}>
            {c === 'MA' ? '🇲🇦 Maroc' : c === 'ES' ? '🇪🇸 Espagne' : '🇪🇺 Europe'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="🔍 Nom, matière active…" className="max-w-64 rounded-full" />
        {FILTERS[country].map(f => (
          <button key={f.id} onClick={() => { setFilter(f.id); setPage(1) }}
            className={clsx('px-3 py-1.5 rounded-full text-xs border transition-all', filter === f.id ? 'bg-accent/15 border-accent text-accent' : 'border-bdr text-tx2 hover:text-tx')}>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-tx3 ms-auto">{data.total.toLocaleString()} résultats</span>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <p className="text-center py-14 text-tx3">…</p>
          : data.rows.length === 0 ? <p className="text-center py-14 text-tx2">{t('noResults')}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-bdr/50 last:border-0 hover:bg-sf2 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-tx">{r.name}</p>
                        <p className="text-[11px] text-tx3 mt-0.5">
                          {country === 'EU' && <>{(r.flags?.length ? r.flags.map((f: string) => `(${f})`).join(' ') + ' · ' : '')}{r.mrl_count} LMR{r.regulation ? ` · ${r.regulation}` : ''}</>}
                          {country === 'MA' && <>{r.holder}{r.category ? ` · ${r.category}` : ''}{r.formulation ? ` · ${r.formulation}` : ''}</>}
                          {country === 'ES' && <>{r.holder}{r.active_ingredient ? ` · ${r.active_ingredient}` : ''}{r.concentration ? ` ${r.concentration}` : ''}</>}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-end whitespace-nowrap">
                        {country === 'EU' && r.flags?.length > 0 && <Badge variant="warning">🚩 {r.flags.length}</Badge>}
                        {country === 'MA' && r.valid_until && <span className="text-[11px] text-tx3">→ {r.valid_until}</span>}
                        {country === 'ES' && <Badge variant={r.status === 'Vigente' ? 'success' : 'critical'}>{r.status}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-sf2 border border-bdr text-tx2 disabled:opacity-30">← {t('prev')}</button>
          <span className="text-xs text-tx3">{t('page')} {page} {t('of')} {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-xs bg-sf2 border border-bdr text-tx2 disabled:opacity-30">{t('next')} →</button>
        </div>
      )}
    </div>
  )
}
