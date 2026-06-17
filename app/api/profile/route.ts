import { NextRequest, NextResponse } from 'next/server'
import { apiUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { profileUpdateSchema } from '@/lib/validations'
import { updateOwnProfile } from '@/lib/data/profiles'

export async function PATCH(req: NextRequest) {
  const ctx = await apiUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await checkRateLimit(`profile:${ctx.user.id}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Les colonnes sensibles (plan/role/...) sont de toute façon protégées par trigger côté DB.
  const { error } = await updateOwnProfile(ctx.supabase, ctx.user.id, parsed.data)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
