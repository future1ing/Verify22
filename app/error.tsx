'use client'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl">⚠️</p>
      <h2 className="font-display font-bold text-xl text-tx">Une erreur est survenue</h2>
      <button onClick={reset} className="px-4 py-2 bg-accent text-bg rounded-lg font-bold text-sm">Réessayer</button>
    </div>
  )
}
