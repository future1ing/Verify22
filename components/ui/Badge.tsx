import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

type Variant = 'critical' | 'warning' | 'info' | 'free' | 'starter' | 'pro' | 'business' | 'neutral' | 'success'

const styles: Record<Variant, string> = {
  critical: 'bg-danger/15 text-danger',
  warning: 'bg-warn/15 text-warn',
  info: 'bg-info/15 text-info',
  success: 'bg-accent/15 text-accent',
  free: 'bg-white/5 text-tx3',
  starter: 'bg-info/15 text-info',
  pro: 'bg-accent/15 text-accent',
  business: 'bg-warn/15 text-warn',
  neutral: 'bg-sf3 text-tx2',
}

export function Badge({ variant = 'neutral', className, ...props }:
  HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wide', styles[variant], className)} {...props} />
  )
}
