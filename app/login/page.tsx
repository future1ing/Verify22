'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LangSwitcher } from '@/components/LangSwitcher'

function LoginForm() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const supabase = createClient()
    
    const { data, error: err } = await supabase.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    })
    
    if (err || !data.user) { 
      setError(t('errorInvalid'))
      setLoading(false)
      return 
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    
    const targetUrl = next || (profile?.role === 'admin' ? '/admin' : '/dashboard')
    window.location.href = targetUrl
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>{t('email')}</Label>
        <Input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
      </div>
      <div>
        <Label>{t('password')}</Label>
        <Input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full mt-4">
        {loading ? t('loading') : t('login')}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center mb-6">
          <LangSwitcher />
        </div>
        
        <Suspense fallback={<p className="text-center">...</p>}>
          <LoginForm />
        </Suspense>
        
        <p className="mt-5 text-center text-xs text-tx3">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-accent underline">
            {t('createAccess')}
          </Link>
        </p>
      </div>
    </main>
  )
}