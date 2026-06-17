import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const PLAN_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER  || 'noop1']: 'starter',
  [process.env.STRIPE_PRICE_PRO      || 'noop2']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS || 'noop3']: 'business',
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ received: true }) // Stripe not configured yet
  }

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' as any })

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.metadata?.user_id
    const priceId = session.metadata?.price_id
    if (userId && PLAN_MAP[priceId]) {
      await supabase.from('profiles').update({
        plan: PLAN_MAP[priceId],
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub     = event.data.object
    const priceId = sub.items.data[0]?.price.id
    await supabase.from('profiles').update({
      plan: PLAN_MAP[priceId] || 'free',
      plan_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
    }).eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    await supabase.from('profiles').update({
      plan: 'free', stripe_subscription_id: null, plan_expires_at: null,
    }).eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
