export function StatCard({ label, value, icon, accent, sub }: {
  label: string; value: string | number; icon: string; accent: string; sub?: string
}) {
  return (
    <div className="bg-sf border border-bdr rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="absolute end-3 top-3 text-xl opacity-15">{icon}</div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tx3 mb-2">{label}</p>
      <p className="text-3xl font-display font-bold text-tx">{value}</p>
      {sub && <p className="text-[11px] text-tx3 mt-1">{sub}</p>}
    </div>
  )
}
