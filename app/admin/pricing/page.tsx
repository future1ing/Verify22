import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { PLAN_PRICES, PLAN_LIMITS, type Plan } from '@/types'

export default async function AdminPricingPage() {
  const tp = await getTranslations('pricing')
  await requireAdmin()
  const admin = createAdminClient()
  const { data: planRows } = await admin.from('profiles').select('plan').eq('role', 'client')

  const counts = (planRows ?? []).reduce<Record<string, number>>((a, r) => { a[r.plan] = (a[r.plan] || 0) + 1; return a }, {})
  const mrr = (planRows ?? []).reduce((s, r) => s + (PLAN_PRICES[r.plan as Plan] || 0), 0)
  const PLANS: Plan[] = ['free', 'starter', 'pro', 'business']

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx mb-5">Tarifs & revenus</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="MRR actuel" value={`${mrr}€`} icon="💶" accent="var(--ac)" />
        <StatCard label="ARR projeté" value={`${mrr * 12}€`} icon="📈" accent="var(--blu)" />
        <StatCard label="Clients payants" value={(counts.starter || 0) + (counts.pro || 0) + (counts.business || 0)} icon="💳" accent="var(--ora)" />
        <StatCard label="Panier moyen" value={`${planRows?.length ? Math.round(mrr / planRows.length) : 0}€`} icon="🛒" accent="var(--red)" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr text-tx3 text-[11px] uppercase tracking-wide">
                <th className="text-start font-semibold px-4 py-3">Plan</th>
                <th className="text-start font-semibold px-4 py-3">Prix</th>
                <th className="text-start font-semibold px-4 py-3">Pays</th>
                <th className="text-start font-semibold px-4 py-3 hidden md:table-cell">Canaux</th>
                <th className="text-start font-semibold px-4 py-3">Clients</th>
                <th className="text-start font-semibold px-4 py-3">MRR</th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map(p => (
                <tr key={p} className="border-b border-bdr/50 last:border-0">
                  <td className="px-4 py-3"><Badge variant={p}>{tp(`plans.${p}.name`)}</Badge></td>
                  <td className="px-4 py-3 text-tx font-medium">{PLAN_PRICES[p]}€<span className="text-tx3 text-xs">/mo</span></td>
                  <td className="px-4 py-3 text-tx2">{PLAN_LIMITS[p].countries === 99 ? 'Tous' : PLAN_LIMITS[p].countries}</td>
                  <td className="px-4 py-3 text-tx3 text-xs hidden md:table-cell">{PLAN_LIMITS[p].channels.join(', ')}</td>
                  <td className="px-4 py-3 text-tx">{counts[p] || 0}</td>
                  <td className="px-4 py-3 text-accent font-medium">{(counts[p] || 0) * PLAN_PRICES[p]}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-tx3 mt-4">💡 Les prix sont définis dans <code className="text-tx2">types/index.ts</code> (PLAN_PRICES). Pour activer les paiements, configurer Stripe puis renseigner les Price IDs dans les variables d'environnement.</p>
    </div>
  )
}
