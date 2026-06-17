import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PLAN_PRICES, type Plan } from '@/types'

export default async function AdminPage() {
  const t = await getTranslations('admin')
  const admin = createAdminClient()

  const [
    { count: totalClients }, { count: activeClients },
    { count: totalAlerts }, { count: criticalAlerts },
    { data: planRows }, { data: lastReport },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client').eq('is_active', true),
    admin.from('alerts').select('*', { count: 'exact', head: true }),
    admin.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
    admin.from('profiles').select('plan').eq('role', 'client'),
    admin.from('diff_reports').select('report_id, generated_at, total_changes').order('generated_at', { ascending: false }).limit(1),
  ])

  const counts = (planRows ?? []).reduce<Record<string, number>>((a, r) => { a[r.plan] = (a[r.plan] || 0) + 1; return a }, {})
  const mrr = (planRows ?? []).reduce((s, r) => s + (PLAN_PRICES[r.plan as Plan] || 0), 0)
  const PLANS: Plan[] = ['free', 'starter', 'pro', 'business']
  const COLORS: Record<Plan, string> = { free: 'var(--tx3)', starter: 'var(--blu)', pro: 'var(--ac)', business: 'var(--ora)' }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-extrabold text-2xl text-tx tracking-tight">{t('title')}</h2>
        <p className="text-xs text-tx2 mt-1">
          {lastReport?.[0] ? `Pipeline : ${new Date(lastReport[0].generated_at).toLocaleDateString()} (${lastReport[0].total_changes} chg.)` : '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label={t('activeClients')} value={activeClients || 0} icon="👥" accent="var(--ac)" sub={`${totalClients || 0} ${t('total')}`} />
        <StatCard label={t('alertsSent')} value={totalAlerts || 0} icon="📬" accent="var(--blu)" />
        <StatCard label={t('criticalAlerts')} value={criticalAlerts || 0} icon="🚨" accent="var(--red)" />
        <StatCard label={t('mrr')} value={`${mrr}€`} icon="💶" accent="var(--ora)" sub={t('monthly')} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>{t('planDist')}</CardTitle>
          {PLANS.map(p => {
            const c = counts[p] || 0
            const pct = totalClients ? Math.round((c / totalClients) * 100) : 0
            return (
              <div key={p} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <Badge variant={p}>{p}</Badge>
                  <span className="text-tx2">{c} · {pct}%</span>
                </div>
                <div className="h-1.5 bg-sf3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[p] }} />
                </div>
              </div>
            )
          })}
        </Card>

        <Card>
          <CardTitle>{t('quickActions')}</CardTitle>
          <div className="space-y-2">
            {[
              [t('runPipeline'), '/admin/pipeline'],
              [t('manageClients'), '/admin/clients'],
              [t('exploreDb'), '/admin/databases'],
              [t('allAlerts'), '/admin/alerts'],
              [t('statsLink'), '/admin/stats'],
            ].map(([label, href]) => (
              <Link key={href} href={href}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm bg-sf2 border border-bdr text-tx2 hover:text-tx hover:border-accent transition-all">
                <span>{label}</span><span className="text-tx3">→</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
