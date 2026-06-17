import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED = ['fr', 'ar', 'es', 'en'] as const
export type Locale = (typeof SUPPORTED)[number]

export default getRequestConfig(async () => {
  const raw = cookies().get('locale')?.value
  const locale: Locale = SUPPORTED.includes(raw as Locale) ? (raw as Locale) : 'fr'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
