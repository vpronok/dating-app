"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PhotoActions({ photoId }: { photoId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function act(action: "approve" | "reject") {
    setBusy(true)
    const res = await fetch(`/api/admin/photos/${photoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else alert("Action failed")
  }

  return (
    <div className="mt-2 flex gap-2">
      <button onClick={() => act("approve")} disabled={busy} className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white">
        Approve
      </button>
      <button onClick={() => act("reject")} disabled={busy} className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white">
        Reject
      </button>
    </div>
  )
}
