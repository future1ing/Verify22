import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser()

  // 1. Récupérer le profil en toute sécurité
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  // 2. Si la table n'existe pas ou bug, on utilise l'app_metadata ou 'client' par défaut
  const userRole = (profile?.role || user?.app_metadata?.role || 'client') as 'client' | 'admin'

  // Redirection automatique si c'est un admin pour éviter le conflit client/admin
  if (userRole === 'admin') {
    redirect('/admin')
  }

  const { count: unread } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="min-h-screen">
      <Sidebar role={userRole} name={profile?.name || user.email?.split('@')[0] || 'Client'} unread={unread || 0} />
      <main className="md:ms-60 pt-20 md:pt-7 px-4 md:px-8 pb-10">{children}</main>
    </div>
  )
}