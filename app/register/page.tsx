'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (!data.session) { setConfirm(true); setLoading(false); return } // confirmation email activée
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,222,128,.08), transparent 70%), var(--bg)' }}>
      <div className="w-full max-w-md bg-sf border border-bdr rounded-2xl p-10">
        <h1 className="font-display font-extrabold text-xl text-tx mb-1.5">{t('registerTitle')}</h1>
        <p className="text-xs text-tx3 mb-6">{t('freeNote')}</p>

        {confirm ? (
          <p className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg p-4">✉️ {t('checkEmail')}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div><Label>{t('name')}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ferme El Ouali" required /></div>
            <div><Label>{t('email')}</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" required /></div>
            <div><Label>{t('password')}</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required /></div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? '…' : t('register')}</Button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-tx3">
          {t('haveAccount')}{' '}<Link href="/login" className="text-accent underline">{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
