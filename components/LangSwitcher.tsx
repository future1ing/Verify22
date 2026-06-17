'use client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { clsx } from 'clsx'

const LANGS = [
  { code: 'fr', label: '🇫🇷 FR' },
  { code: 'ar', label: '🇲🇦 AR' },
  { code: 'es', label: '🇪🇸 ES' },
  { code: 'en', label: '🇬🇧 EN' },
] as const

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale()
  const router = useRouter()
  const [pending, start] = useTransition()

  function set(code: string) {
    start(async () => {
      await fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: code }) })
      router.refresh()
    })
  }

  return (
    <div className="flex gap-1.5 flex-wrap" aria-busy={pending}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => set(l.code)}
          className={clsx('px-2.5 py-1 rounded-full text-[11px] border transition-all',
            locale === l.code ? 'bg-accent/15 border-accent text-accent' : 'border-bdr text-tx2 hover:text-tx')}
        >
          {compact ? l.label.split(' ')[1] : l.label}
        </button>
      ))}
    </div>
  )
}
