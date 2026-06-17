'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { PLAN_PRICES, type Plan } from '@/types'

const PLANS: Plan[] = ['free', 'starter', 'pro', 'business']

export function PricingTable({ currentPlan }: { currentPlan?: Plan }) {
  const tp = useTranslations('pricing')
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<Plan | null>(null)
  const [err, setErr] = useState('')

  async function choose(plan: Plan) {
    if (plan === 'free' || plan === currentPlan) return
    setLoading(plan); setErr('')
    const r = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    }).then(r => r.json()).catch(() => ({ error: 'network' }))
    if (r.url) { window.location.href = r.url; return }
    // Stripe pas encore activé → message clair
    setErr(r.error === 'Stripe not configured yet'
      ? 'Les paiements seront bientôt disponibles. Contactez-nous pour activer votre plan.'
      : 'Une erreur est survenue.')
    setLoading(null)
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-8">
        <button onClick={() => setAnnual(false)} className={clsx('px-4 py-1.5 rounded-full text-xs font-medium', !annual ? 'bg-accent text-bg' : 'text-tx2')}>{tp('monthly')}</button>
        <button onClick={() => setAnnual(true)} className={clsx('px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5', annual ? 'bg-accent text-bg' : 'text-tx2')}>
          {tp('annual')} <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', annual ? 'bg-bg/20' : 'bg-accent/15 text-accent')}>{tp('save2')}</span>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const hot = plan === 'starter'
          const isCurrent = plan === currentPlan
          const monthly = PLAN_PRICES[plan]
          const price = annual && monthly > 0 ? Math.round(monthly * 10) : monthly
          const features = tp.raw(`plans.${plan}.features`) as string[]
          return (
            <div key={plan} className={clsx('bg-sf rounded-xl p-5 flex flex-col', hot ? 'border-2 border-accent' : 'border border-bdr', isCurrent && 'ring-2 ring-accent/40')}>
              <div className="h-6 mb-2">
                {isCurrent ? <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">{tp('current')}</span>
                  : hot ? <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">{tp('popular')}</span> : null}
              </div>
              <p className="font-display font-extrabold text-tx">{tp(`plans.${plan}.name`)}</p>
              <p className="text-tx3 text-xs mb-4 min-h-8">{tp(`plans.${plan}.for`)}</p>
              <p className="font-display font-extrabold text-3xl text-tx">{price}€</p>
              <p className="text-tx3 text-xs mb-5">{plan === 'free' ? tp('forever') : annual ? tp('annualPrice') : tp('perMonth')}</p>
              <Button variant={hot && !isCurrent ? 'primary' : 'secondary'} disabled={plan === 'free' || isCurrent || loading === plan}
                onClick={() => choose(plan)} className="mb-5 text-xs">
                {isCurrent ? tp('current') : loading === plan ? '…' : tp('choose')}
              </Button>
              <ul className="space-y-2 border-t border-bdr pt-4">
                {features.map(f => <li key={f} className="text-xs text-tx2 flex gap-2"><span className="text-accent shrink-0">✓</span>{f}</li>)}
              </ul>
            </div>
          )
        })}
      </div>
      {err && <p className="text-center text-sm text-warn mt-5 bg-warn/10 border border-warn/30 rounded-lg py-3 px-4 max-w-xl mx-auto">{err}</p>}
    </div>
  )
}
