import { NextRequest, NextResponse } from 'next/server'
import { apiAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { searchProducts, type DbCountry } from '@/lib/data/databases'
import { z } from 'zod'

const schema = z.object({
  country: z.enum(['EU', 'MA', 'ES']),
  q: z.string().max(80).optional(),
  filter: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export async function GET(req: NextRequest) {
  const ctx = await apiAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { rows, total, error } = await searchProducts(admin, {
    country: parsed.data.country as DbCountry,
    q: parsed.data.q, filter: parsed.data.filter, page: parsed.data.page, pageSize: 25,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ rows, total, page: parsed.data.page, pageSize: 25 })
}
