'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Alert, Severity } from '@/types'

const SOURCES = ['all', 'EU', 'MA', 'ES'] as const

export default function AlertsPage() {
  const t = useTranslations('alerts')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [allowed, setAllowed] = useState<Severity[]>(['critical'])
  const [sev, setSev] = useState<'all' | 'unread' | Severity>('all')
  const [src, setSrc] = useState<(typeof SOURCES)[number]>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ limit: '100' })
    if (sev !== 'all' && sev !== 'unread') p.set('severity', sev)
    if (sev === 'unread') p.set('is_read', 'false')
    if (src !== 'all') p.set('country', src)
    if (q.trim()) p.set('q', q.trim())
    const r = await fetch('/api/alerts?' + p).then(r => r.json()).catch(() => null)
    if (r?.alerts) { setAlerts(r.alerts); setAllowed(r.allowed_severities ?? []) }
    setLoading(false)
  }, [sev, src, q])

  useEffect(() => { const id = setTimeout(load, q ? 300 : 0); return () => clearTimeout(id) }, [load, q])

  async function markRead(id: number) {
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x))
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alert_id: id }) })
  }
  async function markAll() {
    setAlerts(a => a.map(x => ({ ...x, is_read: true })))
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read_all: true }) })
  }

  const chips: { id: typeof sev; label: string; cls?: string }[] = [
    { id: 'all', label: t('all') },
    { id: 'unread', label: t('unread') },
    ...(['critical', 'warning', 'info'] as Severity[]).filter(s => allowed.includes(s))
      .map(s => ({ id: s as typeof sev, label: t(s), cls: s === 'critical' ? 'data-r' : s === 'warning' ? 'data-o' : '' })),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="font-display font-extrabold text-2xl text-tx">{t('title')}</h2>
        <Button variant="secondary" onClick={markAll} className="text-xs py-2">{t('markAll')}</Button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')} className="max-w-60 rounded-full" />
        {chips.map(c => (
          <button key={c.id} onClick={() => setSev(c.id)}
            className={clsx('px-3 py-1.5 rounded-full text-xs border transition-all',
              sev === c.id
                ? c.id === 'critical' ? 'bg-danger/15 border-danger text-danger'
                : c.id === 'warning' ? 'bg-warn/15 border-warn text-warn'
                : 'bg-accent/15 border-accent text-accent'
                : 'border-bdr text-tx2 hover:text-tx')}>
            {c.label}
          </button>
        ))}
        <span className="w-px h-5 bg-bdr" />
        {SOURCES.map(s => (
          <button key={s} onClick={() => setSrc(s)}
            className={clsx('px-3 py-1.5 rounded-full text-xs border transition-all',
              src === s ? 'bg-accent/15 border-accent text-accent' : 'border-bdr text-tx2 hover:text-tx')}>
            {s === 'all' ? '🌐' : s === 'EU' ? '🇪🇺 EU' : s === 'MA' ? '🇲🇦 MA' : '🇪🇸 ES'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-tx3 text-sm py-10 text-center">…</p>
      ) : alerts.length === 0 ? (
        <p className="text-center py-14 text-tx2"><span className="block text-4xl mb-2 opacity-40">✅</span>{t('empty')}</p>
      ) : alerts.map(a => (
        <div key={a.id} onClick={() => !a.is_read && markRead(a.id)}
          className={clsx('grid grid-cols-[3px_1fr_auto] gap-3 p-3.5 rounded-lg mb-2 border border-bdr cursor-pointer hover:bg-sf2 transition-colors', a.is_read ? 'bg-sf' : 'bg-sf2')}
          style={{ borderInlineStartWidth: 3, borderInlineStartColor: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--ora)' : 'var(--blu)' }}>
          <div />
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={a.severity}>{t(a.severity)}</Badge>
              <Badge variant="neutral">{a.country}</Badge>
              <span className="text-sm font-semibold text-tx">{a.substance_name}</span>
              {a.product_name && a.product_name !== a.substance_name && <span className="text-xs text-tx3">· {a.product_name}</span>}
              {!a.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </div>
            <p className="text-xs text-tx2 mb-1">{a.description}</p>
            <div className="flex gap-3 text-[11px] text-tx3 flex-wrap">
              {a.old_mrl && a.new_mrl && <span><s>{a.old_mrl}</s> → <strong className="text-accent">{a.new_mrl}</strong></span>}
              {a.regulation && <span>📋 {a.regulation}</span>}
              <span>{a.event_type}</span>
            </div>
          </div>
          <span className="text-[11px] text-tx3 whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  )
}
