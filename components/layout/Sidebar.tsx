'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { LangSwitcher } from '@/components/LangSwitcher'

interface Props { role: 'client' | 'admin'; name: string; unread?: number }

export default function Sidebar({ role, name, unread = 0 }: Props) {
  const t = useTranslations('nav')
  const path = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const nav = role === 'admin'
    ? [
        { href: '/admin', icon: '⬡', label: t('dashboard') },
        { href: '/admin/alerts', icon: '🔔', label: t('alerts'), badge: true },
        { href: '/admin/clients', icon: '👥', label: t('clients') },
        { href: '/admin/databases', icon: '🗄️', label: t('databases') },
        { href: '/admin/stats', icon: '📊', label: t('stats') },
        { href: '/admin/pipeline', icon: '⚙️', label: t('pipeline') },
      ]
    : [
        { href: '/dashboard', icon: '⬡', label: t('dashboard') },
        { href: '/dashboard/alerts', icon: '🔔', label: t('alerts'), badge: true },
        { href: '/dashboard/profile', icon: '🌿', label: t('crops') },
        { href: '/dashboard/pricing', icon: '💳', label: t('pricing') },
      ]

  async function logout() {
    await createClient().auth.signOut()
    router.push('/login'); router.refresh()
  }

  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
        <svg width="15" height="15" viewBox="0 0 18 18">
          <polygon points="9,1.5 15,5 15,13 9,16.5 3,13 3,5" fill="none" stroke="#0b0f0e" strokeWidth="1.3"/>
          <line x1="9" y1="1.5" x2="9" y2="16.5" stroke="#0b0f0e" strokeWidth=".9" opacity=".5"/>
          <line x1="3" y1="5" x2="15" y2="13" stroke="#0b0f0e" strokeWidth=".9" opacity=".5"/>
          <line x1="15" y1="5" x2="3" y2="13" stroke="#0b0f0e" strokeWidth=".9" opacity=".5"/>
          <circle cx="9" cy="9" r="2.5" fill="#0b0f0e"/>
        </svg>
      </div>
      <span className="font-display font-extrabold text-tx">Veriphy</span>
    </div>
  )

  return (
    <>
      {/* Barre mobile */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-sf border-b border-bdr flex items-center justify-between px-4">
        {Logo}
        <button onClick={() => setOpen(true)} className="text-tx text-xl p-1" aria-label="Menu">☰</button>
      </header>
      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 start-0 z-50 w-60 bg-sf border-e border-bdr flex flex-col overflow-y-auto transition-transform',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
      )}>
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          {Logo}
          <button onClick={() => setOpen(false)} className="md:hidden text-tx2 p-1" aria-label="Fermer">✕</button>
        </div>
        <div className="px-4 pb-3"><LangSwitcher compact /></div>

        <nav className="flex-1 px-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-tx3 px-2 mb-1.5">
            {role === 'admin' ? t('admin') : t('menu')}
          </p>
          {nav.map(item => {
            const active = path === item.href || (item.href.split('/').length > 2 && path.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={clsx('flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all',
                  active ? 'bg-accent/15 text-accent font-medium' : 'text-tx2 hover:text-tx hover:bg-sf2')}>
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger text-white">{unread}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-bdr flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center text-sm font-bold text-accent shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-tx truncate">{name}</p>
            <p className="text-[11px] text-tx3">{role === 'admin' ? t('administrator') : t('client')}</p>
          </div>
          <button onClick={logout} className="text-tx3 hover:text-danger p-1" title={t('logout')}>⏻</button>
        </div>
      </aside>
    </>
  )
}
