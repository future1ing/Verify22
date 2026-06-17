import { requireAdmin } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin()
  const { count: unread } = await supabase.from('alerts')
    .select('*', { count: 'exact', head: true }).eq('is_read', false)

  return (
    <div className="min-h-screen">
      <Sidebar role="admin" name={profile.name} unread={unread || 0} />
      <main className="md:ms-60 pt-20 md:pt-7 px-4 md:px-8 pb-10">{children}</main>
    </div>
  )
}
