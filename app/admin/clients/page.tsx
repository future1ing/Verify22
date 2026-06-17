import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { adminListClients } from '@/lib/data/profiles'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Plan } from '@/types'

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const t = await getTranslations('admin')
  await requireAdmin()
  const admin = createAdminClient()
  const page = Math.max(1, parseInt(searchParams.page || '1'))
  const q = searchParams.q || ''
  const { rows, total } = await adminListClients(admin, { page, pageSize: 25, q })
  const pages = Math.max(1, Math.ceil(total / 25))

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="font-display font-extrabold text-2xl text-tx">{t('clientsTitle')} <span className="text-tx3 text-base font-sans">({total})</span></h2>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder={t('searchClient')}
            className="px-3.5 py-2 bg-sf2 border border-bdr rounded-full text-sm text-tx outline-none focus:border-accent placeholder:text-tx3 w-56" />
        </form>
      </div>

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center py-14 text-tx2">{t('noClients')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr text-tx3 text-[11px] uppercase tracking-wide">
                  <th className="text-start font-semibold px-4 py-3">{t('col_name')}</th>
                  <th className="text-start font-semibold px-4 py-3">{t('col_plan')}</th>
                  <th className="text-start font-semibold px-4 py-3 hidden md:table-cell">{t('col_country')}</th>
                  <th className="text-start font-semibold px-4 py-3 hidden lg:table-cell">{t('col_crops')}</th>
                  <th className="text-start font-semibold px-4 py-3 hidden md:table-cell">{t('col_joined')}</th>
                  <th className="text-start font-semibold px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} className="border-b border-bdr/50 hover:bg-sf2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-tx">{c.name}</p>
                      <p className="text-[11px] text-tx3">{c.email}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant={c.plan as Plan}>{c.plan}</Badge></td>
                    <td className="px-4 py-3 text-tx2 hidden md:table-cell">{c.countries_watched || '—'}</td>
                    <td className="px-4 py-3 text-tx3 text-xs hidden lg:table-cell max-w-40 truncate">{c.crops || '—'}</td>
                    <td className="px-4 py-3 text-tx3 text-xs hidden md:table-cell">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {c.is_active ? <Badge variant="success">{t('active')}</Badge> : <Badge variant="neutral">{t('inactive')}</Badge>}
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
          {page > 1 && <Link href={`?q=${q}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-xs bg-sf2 border border-bdr text-tx2 hover:text-tx">← {t('prev')}</Link>}
          <span className="text-xs text-tx3">{t('page')} {page} {t('of')} {pages}</span>
          {page < pages && <Link href={`?q=${q}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-xs bg-sf2 border border-bdr text-tx2 hover:text-tx">{t('next')} →</Link>}
        </div>
      )}
    </div>
  )
}
