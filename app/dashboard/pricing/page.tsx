import { getTranslations } from 'next-intl/server'
import { requireUser } from '@/lib/auth'
import { getProfile } from '@/lib/data/profiles'
import { PricingTable } from '@/components/PricingTable'

export default async function PricingPage() {
  const tp = await getTranslations('pricing')
  const { supabase, user } = await requireUser()
  const profile = await getProfile(supabase, user.id)

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx text-center mb-2">{tp('pricingTitle') || 'Tarifs'}</h2>
      <p className="text-tx2 text-sm text-center mb-8 max-w-xl mx-auto">{tp('subtitle')}</p>
      <PricingTable currentPlan={profile?.plan} />
    </div>
  )
}
