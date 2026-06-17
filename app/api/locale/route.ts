import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { localeSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  const parsed = localeSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  cookies().set('locale', parsed.data.locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  return NextResponse.json({ ok: true })
}
