'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LangSwitcher } from '@/components/LangSwitcher'

function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const next = useSearchParams().get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

 async function submit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true); setError('')
  const supabase = createClient()
  
  const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (err || !data.user) { setError(t('errorInvalid')); setLoading(false); return }
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  
  
  const targetUrl = next || (profile?.role === 'admin' ? '/admin' : '/dashboard')
  
  // 2. Kan-forciw hard reload b window.location blast router.push
  window.location.href = targetUrl
}
}

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,222,128,.08), transparent 70%), var(--bg)' }}>
      <div className="w-full max-w-md bg-sf border border-bdr rounded-2xl p-10">
        <Link href="/" className="flex items-center gap-2.5 mb-7">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 22 22">
              <polygon points="11,2 18,6.5 18,15.5 11,20 4,15.5 4,6.5" fill="none" stroke="#0b0f0e" strokeWidth="1.5"/>
              <circle cx="11" cy="11" r="3" fill="#0b0f0e"/>
            </svg>
          </div>
          <div>
            <p className="font-display font-extrabold text-xl text-tx">Veriphy</p>
            <p className="text-[11px] text-tx3">{t('tagline')}</p>
          </div>
        </Link>
        <div className="mb-6"><LangSwitcher /></div>
        <Suspense><LoginForm /></Suspense>
        <p className="mt-5 text-center text-xs text-tx3">
          {t('noAccount')}{' '}<Link href="/register" className="text-accent underline">{t('createAccess')}</Link>
        </p>
      </div>
    </div>
  )
}
