interface UserBatch { email: string; name: string; lines: string[] }

/** Envoie un récap par utilisateur. Sans RESEND_API_KEY → dry_run (aucun envoi). */
export async function notifyUsers(batches: Map<string, UserBatch>): Promise<{ sent: number; dry: number; failed: number }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'alertes@veriphy.app'
  if (!key) return { sent: 0, dry: batches.size, failed: 0 }

  const { Resend } = await import('resend')
  const resend = new Resend(key)
  let sent = 0, failed = 0, i = 0

  for (const [, b] of batches) {
    if (++i > 100) break // garde-fou serverless
    const html = `<div style="font-family:sans-serif"><h2>🌿 Veriphy — ${b.lines.length} alerte(s) réglementaire(s)</h2><ul>${b.lines.map(l => `<li>${l}</li>`).join('')}</ul><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://veriphy.app'}/dashboard/alerts">Voir dans le dashboard →</a></p></div>`
    try {
      await resend.emails.send({ from, to: b.email, subject: `Veriphy — ${b.lines.length} nouvelle(s) alerte(s)`, html })
      sent++
    } catch { failed++ }
  }
  return { sent, dry: 0, failed }
}
