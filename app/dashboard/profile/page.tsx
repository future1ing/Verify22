'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PLAN_LIMITS, type Plan, type Severity, type Channel } from '@/types'

const COUNTRIES = [
  { code: 'EU', label: '🇪🇺 Union Européenne' },
  { code: 'MA', label: '🇲🇦 Maroc' },
  { code: 'ES', label: '🇪🇸 Espagne' },
  { code: 'TR', label: '🇹🇷 Turquie' },
]
const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'email', label: '✉️ Email' },
  { id: 'whatsapp', label: '📱 WhatsApp' },
  { id: 'sms', label: '💬 SMS' },
]
const SEVS: Severity[] = ['info', 'warning', 'critical']

export default function ProfilePage() {
  const t = useTranslations('profile')
  const ts = useTranslations('alerts')
  const tc = useTranslations('common')
  const [plan, setPlan] = useState<Plan>('free')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [crops, setCrops] = useState('')
  const [countries, setCountries] = useState<string[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [minSev, setMinSev] = useState<Severity>('info')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setPlan(p.plan); setName(p.name || ''); setPhone(p.phone || ''); setCrops(p.crops || '')
        setCountries((p.countries_watched || '').split(',').map((s: string) => s.trim()).filter(Boolean))
        setChannels((p.notify_channels || '').split(',').map((s: string) => s.trim()).filter(Boolean))
        setMinSev(p.min_severity || 'info')
      }
      setLoading(false)
    })()
  }, [])

  const limits = PLAN_LIMITS[plan]
  const maxCountries = limits.countries
  const allowedChannels = limits.channels

  function toggleCountry(code: string) {
    setCountries(prev => {
      if (prev.includes(code)) return prev.filter(c => c !== code)
      if (prev.length >= maxCountries) return prev // respecte la limite du plan
      return [...prev, code]
    })
  }
  function toggleChannel(id: Channel) {
    if (!allowedChannels.includes(id)) return
    setChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function save() {
    setSaving(true); setMsg('')
    const r = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, crops,
        countries_watched: countries.join(','),
        notify_channels: channels.join(','),
        min_severity: minSev,
      }),
    }).then(r => r.json()).catch(() => ({ error: true }))
    setMsg(r.error ? t('saveErr') : t('saved'))
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <p className="text-tx3 text-sm py-10">…</p>

  return (
    <div className="max-w-3xl">
      <h2 className="font-display font-extrabold text-2xl text-tx mb-6">{t('title')}</h2>

      <Card className="mb-4">
        <CardTitle>{t('identity')}</CardTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>{t('name')}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>{t('phone')}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+212 6 …" /></div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('cropsTitle')}</CardTitle>
        <Label>{t('cropsHint')}</Label>
        <textarea value={crops} onChange={e => setCrops(e.target.value)} placeholder={t('cropsPh')} rows={2}
          className="w-full px-3.5 py-2.5 bg-sf2 border border-bdr rounded-lg text-sm text-tx outline-none focus:border-accent placeholder:text-tx3 resize-none" />
        {crops.trim() && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {crops.split(',').map(c => c.trim()).filter(Boolean).map((c, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/20">🌿 {c}</span>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('countriesTitle')}</CardTitle>
        <p className="text-[11px] text-tx3 mb-3">{t('planLimit', { plan, n: maxCountries })}</p>
        <div className="grid grid-cols-2 gap-2">
          {COUNTRIES.map(c => {
            const on = countries.includes(c.code)
            const disabled = !on && countries.length >= maxCountries
            return (
              <button key={c.code} onClick={() => toggleCountry(c.code)} disabled={disabled}
                className={clsx('px-3.5 py-2.5 rounded-lg text-sm border text-start transition-all',
                  on ? 'bg-accent/15 border-accent text-accent' : disabled ? 'border-bdr text-tx3 opacity-40 cursor-not-allowed' : 'border-bdr text-tx2 hover:text-tx')}>
                {on ? '✓ ' : ''}{c.label}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>{t('channelsTitle')}</CardTitle>
          <div className="space-y-2">
            {CHANNELS.map(ch => {
              const on = channels.includes(ch.id)
              const locked = !allowedChannels.includes(ch.id)
              return (
                <button key={ch.id} onClick={() => toggleChannel(ch.id)} disabled={locked}
                  className={clsx('w-full px-3.5 py-2.5 rounded-lg text-sm border flex items-center justify-between transition-all',
                    on ? 'bg-accent/15 border-accent text-accent' : locked ? 'border-bdr text-tx3 opacity-40 cursor-not-allowed' : 'border-bdr text-tx2 hover:text-tx')}>
                  <span>{ch.label}</span>
                  {locked ? <span className="text-[10px]">🔒 Pro</span> : on ? <span>✓</span> : null}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>{t('minSevTitle')}</CardTitle>
          <p className="text-[11px] text-tx3 mb-3">{t('minSevHint')}</p>
          <div className="space-y-2">
            {SEVS.map(s => (
              <button key={s} onClick={() => setMinSev(s)}
                className={clsx('w-full px-3.5 py-2.5 rounded-lg text-sm border text-start transition-all',
                  minSev === s
                    ? s === 'critical' ? 'bg-danger/15 border-danger text-danger'
                    : s === 'warning' ? 'bg-warn/15 border-warn text-warn'
                    : 'bg-info/15 border-info text-info'
                    : 'border-bdr text-tx2 hover:text-tx')}>
                {minSev === s ? '✓ ' : ''}{ts(s)}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? '…' : tc('save')}</Button>
        {msg && <span className={clsx('text-sm', msg.includes('✓') ? 'text-accent' : 'text-danger')}>{msg}</span>}
      </div>
    </div>
  )
}
