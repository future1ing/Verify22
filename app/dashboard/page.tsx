import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireUser } from '@/lib/auth'
import { getProfile } from '@/lib/data/profiles'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Alert } from '@/types'

const DB_COV = [
  { cc: 'EU', flag: '🇪🇺', src: 'EU Commission — MRL Database', prods: 666, recs: 252445, col: '#60a5fa', ok: true },
  { cc: 'MA', flag: '🇲🇦', src: 'ONSSA — Index Phytosanitaire', prods: 1335, recs: 4645, col: '#4ade80', ok: true },
  { cc: 'ES', flag: '🇪🇸', src: 'MAPA — Registro Fitosanitarios', prods: 3058, recs: 1972, col: '#fb923c', ok: true, warn: '408 produits expirent dans 90j' },
  { cc: 'TR', flag: '🇹🇷', src: 'EU Commission (export)', prods: 666, recs: 252445, col: '#a78bfa', ok: true },
  { cc: 'EG', flag: '🇪🇬', src: 'MALR — Égypte', prods: 0, recs: 0, col: '#94a3b8', ok: false },
]

export default async function DashboardPage() {
  const t = await getTranslations('dash')
  const ta = await getTranslations('alerts')
  const tc = await getTranslations('common')
  const { supabase, user } = await requireUser()
  const isAdmin = user?.app_metadata?.role === 'admin';
  const [profile, { data: alerts }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])
  const list = (alerts ?? []) as Alert[]
  const unread = list.filter(a => !a.is_read).length
  const critical = list.filter(a => a.severity === 'critical').length

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-extrabold text-2xl text-tx tracking-tight">{t('title')}</h2>
        <p className="text-xs text-tx2 mt-1">
          {t('hello')} {profile?.name} • {isAdmin ? 'Administrateur' : profile?.plan}
          </p>
      </div>

      <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-5 flex-wrap">
        <p className="text-sm font-medium text-danger">{t('urgent')}</p>
        <Link href="/dashboard/alerts" className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-danger text-white whitespace-nowrap">{tc('see')} →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label={t('unread')} value={unread} icon="🔔" accent="var(--ac)" />
        <StatCard label={t('critical')} value={critical} icon="🚨" accent="var(--red)" />
        <StatCard label={t('total')} value={list.length} icon="📋" accent="var(--blu)" />
        <StatCard label={t('countries')} value={2} icon="🌍" accent="var(--ora)" />
      </div>

      <CardTitle className="mb-3">{t('coverage')}</CardTitle>
      <div className="grid md:grid-cols-2 gap-2.5 mb-6">
        {DB_COV.map(d => (
          <div key={d.cc} className="bg-sf border border-bdr rounded-xl p-3.5 flex gap-3">
            <span className="text-xl shrink-0">{d.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-tx">{d.cc} — {d.src.split('—')[0].trim()}</p>
              <p className="text-[11px] text-tx3 mb-1">{d.src}</p>
              <p className="text-[11px] text-tx2">
                {d.ok
                  ? <><strong className="text-tx">{d.prods.toLocaleString()}</strong> {t('products')} · <strong className="text-tx">{d.recs.toLocaleString()}</strong> {t('records')}</>
                  : <span className="text-tx3">{t('pending')}</span>}
              </p>
              {d.warn && <p className="text-[10.5px] text-warn mt-1">⚠️ {d.warn}</p>}
              <div className="h-[3px] bg-sf3 rounded mt-2 overflow-hidden">
                <div className="h-full rounded" style={{ width: d.ok ? '100%' : '0%', background: d.col }} />
              </div>
            </div>
            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: d.ok ? 'var(--ac)' : 'var(--tx3)' }} />
          </div>
        ))}
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <CardTitle className="mb-0">{t('latest')}</CardTitle>
          <Link href="/dashboard/alerts" className="text-xs text-accent">{tc('seeAll')} →</Link>
        </div>
        {list.length === 0 ? (
          <p className="text-center py-10 text-tx2"><span className="block text-3xl mb-2 opacity-40">✅</span>{t('noAlerts')}</p>
        ) : list.map(a => (
          <div key={a.id} className={`grid grid-cols-[3px_1fr_auto] gap-3 p-3.5 rounded-lg mb-2 border border-bdr ${a.is_read ? 'bg-sf' : 'bg-sf2'}`}
            style={{ borderInlineStartWidth: 3, borderInlineStartColor: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--ora)' : 'var(--blu)' }}>
            <div />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={a.severity}>{ta(a.severity)}</Badge>
                <Badge variant="neutral">{a.country}</Badge>
                <span className="text-sm font-semibold text-tx">{a.substance_name}</span>
                {!a.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </div>
              <p className="text-xs text-tx2">{a.description}</p>
            </div>
            <span className="text-[11px] text-tx3 whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
