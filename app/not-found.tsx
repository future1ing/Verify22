import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display font-extrabold text-6xl text-accent">404</p>
      <p className="text-tx2">Cette page n&apos;existe pas.</p>
      <Link href="/" className="px-4 py-2 bg-accent text-bg rounded-lg font-bold text-sm">← Accueil</Link>
    </div>
  )
}
