"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function UserActions({
  userId,
  isActive,
}: {
  userId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function act(action: "suspend" | "activate") {
    setBusy(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else alert("Action failed")
  }

  return isActive ? (
    <button onClick={() => act("suspend")} disabled={busy} className="rounded border border-red-400 px-3 py-1 text-xs text-red-600">
      Suspend
    </button>
  ) : (
    <button onClick={() => act("activate")} disabled={busy} className="rounded border border-green-400 px-3 py-1 text-xs text-green-600">
      Activate
    </button>
  )
}
