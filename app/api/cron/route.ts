import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Vercel Cron — runs 1st of every month at 6h UTC
// Configured in vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 6 1 * *" }] }

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startedAt = new Date().toISOString()

  try {
    // 1. Log the run
    await supabase.from('diff_reports').insert({
      report_id:   `CRON_${startedAt.split('T')[0]}`,
      country:     'EU',
      report_data: { status: 'triggered', triggered_at: startedAt, note: 'Monthly pipeline cron' },
    })

    // 2. TODO: download latest XML from EU Commission, run diff engine,
    //    match clients, generate and send notifications
    //    (implement when pipeline Python scripts are migrated to JS/TS or called via edge function)

    return NextResponse.json({ ok: true, triggered_at: startedAt })
  } catch (err) {
    console.error('[CRON]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
