'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const supabase = createClient()

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (err) {
      setError(err.message)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-4 border rounded">
      <h1 className="text-xl font-bold">Login</h1>
      
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2"
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2"
        required
      />

      {error && <p className="text-red-500">{error}</p>}
      
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Sign In
      </button>
    </form>
  )
}