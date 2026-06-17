import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LangSwitcher } from '@/components/LangSwitcher'
import { PLAN_PRICES, type Plan } from '@/types'

const Logo = ({ size = 36 }: { size?: number }) => (
  <div className="flex items-center gap-2.5">
    <div className="bg-accent rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 22 22">
        <polygon points="11,2 18,6.5 18,15.5 11,20 4,15.5 4,6.5" fill="none" stroke="#0b0f0e" strokeWidth="1.5"/>
        <line x1="11" y1="2" x2="11" y2="20" stroke="#0b0f0e" strokeWidth="1" opacity=".5"/>
        <line x1="4" y1="6.5" x2="18" y2="15.5" stroke="#0b0f0e" strokeWidth="1" opacity=".5"/>
        <line x1="18" y1="6.5" x2="4" y2="15.5" stroke="#0b0f0e" strokeWidth="1" opacity=".5"/>
        <circle cx="11" cy="11" r="3" fill="#0b0f0e"/>
      </svg>
    </div>
    <span className="font-display font-extrabold text-xl text-tx">Veriphy</span>
  </div>
)

export default async function Landing() {
  const t = await getTranslations('landing')
  const tp = await getTranslations('pricing')
  const ta = await getTranslations('auth')

  const PLANS: Plan[] = ['free', 'starter', 'pro', 'business']

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(74,222,128,.07), transparent 70%), var(--bg)' }}>
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4 flex-wrap">
        <Logo />
        <div className="flex items-center gap-4 flex-wrap">
          <LangSwitcher compact />
          <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-bg">{ta('login')}</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-12 text-center">
        <h1 className="font-display font-extrabold text-4xl md:text-5xl text-tx leading-tight tracking-tight">{t('heroTitle')}</h1>
        <p className="text-tx2 mt-5 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">{t('heroSub')}</p>
        <div className="flex gap-3 justify-center mt-8 flex-wrap">
          <Link href="/register" className="px-6 py-3 rounded-lg font-display font-bold text-sm bg-accent text-bg">{t('ctaStart')}</Link>
          <Link href="#pricing" className="px-6 py-3 rounded-lg font-display font-bold text-sm border border-bdr text-tx hover:border-accent">{t('ctaPricing')}</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-5 pb-16">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ['252 445', t('statRecords')],
            ['3', t('statSources')],
            ['5', t('statCountries')],
          ].map(([v, l]) => (
            <div key={l} className="bg-sf border border-bdr rounded-xl py-6 px-3">
              <p className="font-display font-extrabold text-2xl md:text-3xl text-accent">{v}</p>
              <p className="text-tx3 text-xs mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <h2 className="font-display font-bold text-2xl text-tx text-center mb-10">{t('featuresTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ['🛰️', t('f1t'), t('f1d')],
            ['📲', t('f2t'), t('f2d')],
            ['🏛️', t('f3t'), t('f3d')],
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-sf border border-bdr rounded-xl p-6">
              <p className="text-2xl mb-3">{icon}</p>
              <h3 className="font-display font-bold text-tx mb-2">{title}</h3>
              <p className="text-tx2 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 pb-20">
        <h2 className="font-display font-bold text-2xl text-tx text-center mb-2">{t('pricingTitle')}</h2>
        <p className="text-tx2 text-sm text-center mb-10 max-w-xl mx-auto">{tp('subtitle')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const hot = plan === 'starter'
            const features = tp.raw(`plans.${plan}.features`) as string[]
            return (
              <div key={plan} className={`bg-sf rounded-xl p-5 flex flex-col ${hot ? 'border-2 border-accent' : 'border border-bdr'}`}>
                <div className="h-6 mb-2">{hot && <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">{tp('popular')}</span>}</div>
                <p className="font-display font-extrabold text-tx">{tp(`plans.${plan}.name`)}</p>
                <p className="text-tx3 text-xs mb-4 min-h-8">{tp(`plans.${plan}.for`)}</p>
                <p className="font-display font-extrabold text-3xl text-tx">{PLAN_PRICES[plan]}€</p>
                <p className="text-tx3 text-xs mb-5">{plan === 'free' ? tp('forever') : tp('perMonth')}</p>
                <Link href="/register" className={`text-center py-2.5 rounded-lg font-display font-bold text-xs mb-5 ${hot ? 'bg-accent text-bg' : 'bg-sf2 border border-bdr text-tx'}`}>
                  {tp('choose')}
                </Link>
                <ul className="space-y-2 border-t border-bdr pt-4">
                  {features.map(f => (
                    <li key={f} className="text-xs text-tx2 flex gap-2"><span className="text-accent shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA + Footer */}
      <section className="max-w-3xl mx-auto px-5 pb-16 text-center">
        <div className="bg-sf border border-bdr rounded-2xl py-10 px-6">
          <h2 className="font-display font-bold text-xl text-tx mb-5">{t('heroTitle')}</h2>
          <Link href="/register" className="inline-block px-6 py-3 rounded-lg font-display font-bold text-sm bg-accent text-bg">{t('ctaStart')}</Link>
        </div>
      </section>
      <footer className="border-t border-bdr py-6 text-center text-tx3 text-xs">
        © {new Date().getFullYear()} Veriphy — {t('footer')}
      </footer>
    </div>
  )
}
