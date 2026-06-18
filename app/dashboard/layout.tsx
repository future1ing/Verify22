export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser()
  
 
  const userRole = user?.app_metadata?.role || 'client'



  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()

  const { count: unread } = await supabase.from('alerts')
    .select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)

  return (
    <div className="min-h-screen">
      {/* 🌟 ICI on passe le userRole dynamique au lieu de "client" statique */}
      <Sidebar role={userRole} name={profile?.name || 'Client'} unread={unread || 0} />
      <main className="md:ms-60 pt-20 md:pt-7 px-4 md:px-8 pb-10">{children}</main>
    </div>
  )
}