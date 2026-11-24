"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Registration failed")
      setLoading(false)
      return
    }

    // auto-login right after signup
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Registered, but auto-login failed — try logging in.")
      return
    }

    router.push("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password" placeholder="Password (min 8 chars)" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8}
          className="w-full rounded-md border px-3 py-2"
        />
        <button
          type="submit" disabled={loading}
          className="w-full rounded-md bg-black py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>
        <p className="text-center text-sm">
          Already have an account? <a href="/login" className="underline">Log in</a>
        </p>
      </form>
    </main>
  )
}