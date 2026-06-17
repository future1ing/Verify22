'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type Country = 'MA' | 'ES' | 'EU'
const ACCEPT: Record<Country, string> = { MA: '.xls,.gz,.html', ES: '.xlsx', EU: '.xml' }

export default function PipelinePage() {
  const t = useTranslations('pipeline')
  const [country, setCountry] = useState<Country>('MA')
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<'idle' | 'upload' | 'run'>('idle')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [reports, setReports] = useState<any[]>([])

  async function loadReports() {
    const { data } = await createClient().from('diff_reports')
      .select('report_id,country,total_changes,critical_count,warning_count,info_count,generated_at')
      .order('generated_at', { ascending: false }).limit(8)
    setReports(data ?? [])
  }
  useEffect(() => { loadReports() }, [])

  async function run() {
    if (!file) return
    setError(''); setResult(null); setState('upload')
    const sb = createClient()
    const path = `${country}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
    const { error: upErr } = await sb.storage.from('pipeline-uploads').upload(path, file)
    if (upErr) { setError(upErr.message); setState('idle'); return }

    setState('run')
    const r = await fetch('/api/pipeline/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, storagePath: path }),
    }).then(r => r.json()).catch(e => ({ error: String(e) }))
    if (r.error) setError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error))
    else { setResult(r); loadReports() }
    setState('idle')
  }

  return (
    <div>
      <h2 className="font-display font-extrabold text-2xl text-tx mb-1">{t('title')}</h2>
      <p className="text-xs text-tx2 mb-6">{t('sub')}</p>

      <Card className="mb-5">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <p className="text-xs font-medium text-tx2 mb-1.5">{t('country')}</p>
            <div className="flex gap-2">
              {(['MA', 'ES', 'EU'] as Country[]).map(c => (
                <button key={c} onClick={() => setCountry(c)}
                  className={`px-3.5 py-2 rounded-lg text-sm border transition-all ${country === c ? 'bg-accent/15 border-accent text-accent' : 'border-bdr text-tx2'}`}>
                  {c === 'MA' ? '🇲🇦 MA' : c === 'ES' ? '🇪🇸 ES' : '🇪🇺 EU'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-tx2 mb-1.5">{t('file')} ({ACCEPT[country]})</p>
            <input type="file" accept={ACCEPT[country]} onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="text-xs text-tx2 file:me-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-sf3 file:text-tx file:text-xs w-full" />
          </div>
          <Button onClick={run} disabled={!file || state !== 'idle'}>
            {state === 'idle' ? t('run') : t('running')}
          </Button>
        </div>
        {country === 'EU' && <p className="text-[11px] text-tx3 mt-3">ℹ️ {t('euNote')}</p>}
        {error && <p className="text-xs text-danger mt-3">❌ {error}</p>}
        {result && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              [result.changes, t('changes')],
              [result.alerts_created, t('alertsCreated')],
              [result.clients_notified, t('clientsNotified')],
              [result.parsed, 'parsed'],
            ].map(([v, l]) => (
              <div key={String(l)} className="bg-sf2 rounded-lg py-3">
                <p className="font-display font-bold text-xl text-accent">{v}</p>
                <p className="text-[11px] text-tx3">{l}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>{t('reports')}</CardTitle>
        {reports.length === 0 ? <p className="text-xs text-tx3">—</p> : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.report_id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-sf2 border border-bdr text-xs flex-wrap">
                <span className="font-mono text-tx2">{r.report_id}</span>
                <Badge variant="neutral">{r.country}</Badge>
                <span className="text-tx">{r.total_changes} chg.</span>
                <span className="flex gap-1.5">
                  <Badge variant="critical">{r.critical_count}</Badge>
                  <Badge variant="warning">{r.warning_count}</Badge>
                  <Badge variant="info">{r.info_count}</Badge>
                </span>
                <span className="text-tx3">{new Date(r.generated_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
