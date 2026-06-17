import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-bg font-bold hover:opacity-85',
  secondary: 'bg-sf2 text-tx border border-bdr hover:border-accent',
  ghost: 'bg-transparent text-tx2 hover:text-tx hover:bg-sf2',
  danger: 'bg-danger text-white font-bold hover:opacity-85',
}

export function Button({ variant = 'primary', className, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx('px-4 py-2.5 rounded-lg text-sm font-display transition-all disabled:opacity-50 disabled:cursor-not-allowed', styles[variant], className)}
      {...props}
    />
  )
}
