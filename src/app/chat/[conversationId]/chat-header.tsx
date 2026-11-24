"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const REASONS = [
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
  { value: "FAKE_PROFILE", label: "Fake profile" },
  { value: "UNDERAGE", label: "Underage" },
  { value: "OTHER", label: "Other" },
]

export default function ChatHeader({
  otherUserId,
  otherName,
}: {
  otherUserId: string
  otherName: string
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState("HARASSMENT")
  const [details, setDetails] = useState("")
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  async function block() {
    if (!confirm(`Block ${otherName}? You won't see each other again.`)) return
    setBusy(true)
    const res = await fetch("/api/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: otherUserId }),
    })
    setBusy(false)
    if (res.ok) router.push("/matches")
    else setMsg("Could not block")
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: otherUserId, reason, details }),
    })
    if (res.ok && alsoBlock) {
      await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: otherUserId }),
      })
    }
    setBusy(false)
    if (res.ok) {
      if (alsoBlock) router.push("/matches")
      else {
        setReporting(false)
        setMenuOpen(false)
        setMsg("Report submitted")
      }
    } else {
      setMsg("Could not submit report")
    }
  }

  return (
    <div className="mb-3 border-b pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{otherName}</h1>
        <button onClick={() => setMenuOpen((o) => !o)} className="px-2 py-1 text-xl">⋮</button>
      </div>
      {msg && <p className="text-xs text-green-600">{msg}</p>}

      {menuOpen && !reporting && (
        <div className="mt-2 flex gap-2">
          <button onClick={() => setReporting(true)} className="rounded border px-3 py-1 text-sm">
            Report
          </button>
          <button
            onClick={block}
            disabled={busy}
            className="rounded border border-red-400 px-3 py-1 text-sm text-red-600"
          >
            Block
          </button>
        </div>
      )}

      {reporting && (
        <form onSubmit={submitReport} className="mt-2 space-y-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
            />
            Also block this user
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded bg-black px-3 py-1 text-sm text-white">
              Submit report
            </button>
            <button type="button" onClick={() => setReporting(false)} className="rounded border px-3 py-1 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}