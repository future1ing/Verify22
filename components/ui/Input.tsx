import { clsx } from 'clsx'
import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx('w-full px-3.5 py-2.5 bg-sf2 border border-bdr rounded-lg text-sm text-tx outline-none transition-colors focus:border-accent placeholder:text-tx3', className)}
      {...props}
    />
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('block text-xs font-medium text-tx2 mb-1.5', className)} {...props} />
}
