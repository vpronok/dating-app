"use client"

import { useEffect, useState } from "react"

type Candidate = {
  userId: string
  displayName: string
  bio: string | null
  city: string | null
  age: number
  interests: string[]
  photos: string[]
  distanceKm: number | null
}

export default function SwipeDeck() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")

  async function load() {
    setLoading(true)
    setMsg("")
    const res = await fetch("/api/discover")
    const data = await res.json()
    if (res.ok) {
      setCandidates(data.candidates ?? [])
      setIndex(0)
    } else {
      setMsg(data.error ?? "Could not load")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const current = candidates[index]

  async function swipe(type: "LIKE" | "PASS" | "SUPERLIKE") {
    if (!current) return
    const target = current
    setIndex((i) => i + 1) // advance immediately for snappy feel

    const res = await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swipeeId: target.userId, type }),
    })
    const data = await res.json()
    if (res.ok && data.match) {
      setMsg(`It's a match with ${target.displayName}! 🎉`)
    }
  }

  if (loading) return <p>Loading…</p>

  if (!current) {
    return (
      <div className="space-y-3">
        {msg && <p className="text-green-600">{msg}</p>}
        <p className="text-gray-600">No more people right now. Check back later.</p>
        <button onClick={load} className="rounded bg-black px-4 py-2 text-white">
          Reload
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {msg && <p className="rounded bg-green-50 p-2 text-green-700">{msg}</p>}

      <div className="overflow-hidden rounded-xl border">
        {current.photos[0] ? (
          <img src={current.photos[0]} alt="" className="h-80 w-full object-cover" />
        ) : (
          <div className="flex h-80 w-full items-center justify-center bg-gray-100 text-gray-400">
            No photo
          </div>
        )}
        <div className="p-4">
          <h2 className="text-xl font-semibold">
            {current.displayName}, {current.age}
          </h2>
          {current.city && (
            <p className="text-sm text-gray-500">
              {current.city}
              {current.distanceKm != null && ` · ${current.distanceKm} km away`}
            </p>
          )}
          {current.bio && <p className="mt-2 text-sm">{current.bio}</p>}
          {current.interests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {current.interests.map((i) => (
                <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => swipe("PASS")}
          className="rounded-full border px-6 py-3">✕ Pass</button>
        <button onClick={() => swipe("SUPERLIKE")}
          className="rounded-full border border-blue-400 px-6 py-3 text-blue-600">★ Super</button>
        <button onClick={() => swipe("LIKE")}
          className="rounded-full bg-pink-500 px-6 py-3 text-white">♥ Like</button>
      </div>
    </div>
  )
}