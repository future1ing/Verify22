import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Alert, Severity } from '@/types'

export default async function AdminAlertsPage() {
  const ta = await getTranslations('alerts')
  await requireAdmin()
  const admin = createAdminClient()

  const [{ data: alerts }, { count: total }] = await Promise.all([
    admin.from('alerts').select('*, profiles(name,email)').order('created_at', { ascending: false }).limit(100),
    admin.from('alerts').select('*', { count: 'exact', head: true }),
  ])
  const list = (alerts ?? []) as (Alert & { profiles?: { name: string; email: string } })[]

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx mb-5">{ta('title')} <span className="text-tx3 text-base font-sans">({total})</span></h2>
      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? <p className="text-center py-14 text-tx2">{ta('empty')}</p> : list.map(a => (
          <div key={a.id} className="grid grid-cols-[3px_1fr_auto] gap-3 p-3.5 border-b border-bdr/50 last:border-0"
            style={{ borderInlineStartWidth: 3, borderInlineStartColor: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--ora)' : 'var(--blu)' }}>
            <div />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={a.severity as Severity}>{ta(a.severity)}</Badge>
                <Badge variant="neutral">{a.country}</Badge>
                <span className="text-sm font-semibold text-tx">{a.substance_name}</span>
                <span className="text-[11px] text-tx3">→ {a.profiles?.name ?? a.user_id.slice(0, 8)}</span>
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
