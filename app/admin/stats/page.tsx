import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { PLAN_PRICES, type Plan } from '@/types'

function Bars({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-tx2">{d.label}</span>
            <span className="text-tx font-medium">{d.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-sf3 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function StatsPage() {
  const t = await getTranslations('admin')
  await requireAdmin()
  const admin = createAdminClient()

  const [
    { data: alerts }, { data: planRows }, { count: totalClients },
    { count: euCount }, { count: maCount }, { count: esCount },
  ] = await Promise.all([
    admin.from('alerts').select('severity,country,source'),
    admin.from('profiles').select('plan').eq('role', 'client'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    admin.from('eu_substances').select('*', { count: 'exact', head: true }),
    admin.from('ma_products').select('*', { count: 'exact', head: true }),
    admin.from('es_products').select('*', { count: 'exact', head: true }),
  ])

  const A = alerts ?? []
  const bySev = (['critical', 'warning', 'info'] as const).map(s => ({
    label: s, value: A.filter(a => a.severity === s).length,
    color: s === 'critical' ? 'var(--red)' : s === 'warning' ? 'var(--ora)' : 'var(--blu)',
  }))

  const countries = Array.from(new Set(A.map(a => a.country)))
  const byCountry = countries.map(c => ({ label: c, value: A.filter(a => a.country === c).length, color: 'var(--ac)' }))
    .sort((a, b) => b.value - a.value)

  const counts = (planRows ?? []).reduce<Record<string, number>>((a, r) => { a[r.plan] = (a[r.plan] || 0) + 1; return a }, {})
  const mrr = (planRows ?? []).reduce((s, r) => s + (PLAN_PRICES[r.plan as Plan] || 0), 0)
  const arr = mrr * 12

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx mb-5">{t('statsTitle')}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="MRR" value={`${mrr}€`} icon="💶" accent="var(--ac)" sub={`ARR ${arr}€`} />
        <StatCard label={t('activeClients')} value={totalClients || 0} icon="👥" accent="var(--blu)" />
        <StatCard label="Alertes" value={A.length} icon="🔔" accent="var(--ora)" />
        <StatCard label="Substances EU" value={(euCount || 0).toLocaleString()} icon="🧪" accent="var(--red)" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card><CardTitle>{t('bySeverity')}</CardTitle><Bars data={bySev} /></Card>
        <Card><CardTitle>{t('byCountry')}</CardTitle>{byCountry.length ? <Bars data={byCountry} /> : <p className="text-xs text-tx3">—</p>}</Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>📦 Bases importées</CardTitle>
          <Bars data={[
            { label: '🇪🇺 Substances EU', value: euCount || 0, color: '#60a5fa' },
            { label: '🇲🇦 Produits MA', value: maCount || 0, color: '#4ade80' },
            { label: '🇪🇸 Produits ES', value: esCount || 0, color: '#fb923c' },
          ]} />
        </Card>
        <Card>
          <CardTitle>{t('mrrProjection')}</CardTitle>
          <Bars data={(['free', 'starter', 'pro', 'business'] as Plan[]).map(p => ({
            label: `${p} (${counts[p] || 0})`,
            value: (counts[p] || 0) * PLAN_PRICES[p],
            color: p === 'business' ? '#fb923c' : p === 'pro' ? '#4ade80' : p === 'starter' ? '#60a5fa' : '#5a7060',
          }))} />
        </Card>
      </div>
    </div>
  )
}
