"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function act(action: "dismiss" | "review" | "ban") {
    if (action === "ban" && !confirm("Ban this user? They will be suspended.")) return
    setBusy(true)
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else alert("Action failed")
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button onClick={() => act("review")} disabled={busy} className="rounded border px-3 py-1 text-xs">
        Mark reviewed
      </button>
      <button onClick={() => act("dismiss")} disabled={busy} className="rounded border px-3 py-1 text-xs">
        Dismiss
      </button>
      <button onClick={() => act("ban")} disabled={busy} className="rounded border border-red-400 px-3 py-1 text-xs text-red-600">
        Ban user
      </button>
    </div>
  )
}
