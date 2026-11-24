"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const GENDER_OPTIONS = ["male", "female", "non-binary", "other"]

type Pref = {
  minAge: number
  maxAge: number
  maxDistanceKm: number
  seekingGenders: string[]
} | null

type Loc = {
  latitude: number | null
  longitude: number | null
  city: string | null
  locationUpdatedAt: string | null
} | null

export default function SettingsForm({
  initialPref,
  initialLocation,
}: {
  initialPref: Pref
  initialLocation: Loc
}) {
  const router = useRouter()
  const [minAge, setMinAge] = useState(initialPref?.minAge ?? 18)
  const [maxAge, setMaxAge] = useState(initialPref?.maxAge ?? 99)
  const [maxDistanceKm, setMaxDistanceKm] = useState(initialPref?.maxDistanceKm ?? 50)
  const [seeking, setSeeking] = useState<string[]>(initialPref?.seekingGenders ?? [])
  const [city, setCity] = useState(initialLocation?.city ?? "")
  const [lat, setLat] = useState<number | null>(initialLocation?.latitude ?? null)
  const [lng, setLng] = useState<number | null>(initialLocation?.longitude ?? null)
  const [prefMsg, setPrefMsg] = useState("")
  const [locMsg, setLocMsg] = useState("")

  function toggleGender(g: string) {
    setSeeking((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault()
    setPrefMsg("Saving…")
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        maxDistanceKm: Number(maxDistanceKm),
        seekingGenders: seeking,
      }),
    })
    const data = await res.json()
    setPrefMsg(res.ok ? "Saved!" : data.error ?? "Error saving")
    if (res.ok) router.refresh()
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocMsg("Geolocation not supported in this browser")
      return
    }
    setLocMsg("Getting location…")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude
        const res = await fetch("/api/profile/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, city: city || undefined }),
        })
        const data = await res.json()
        if (res.ok) {
          setLat(latitude)
          setLng(longitude)
          setLocMsg("Location saved!")
          router.refresh()
        } else {
          setLocMsg(data.error ?? "Could not save location")
        }
      },
      (err) => setLocMsg("Permission denied or unavailable: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function saveCity() {
    if (lat == null || lng == null) {
      setLocMsg("Set your location first")
      return
    }
    const res = await fetch("/api/profile/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng, city: city || undefined }),
    })
    if (res.ok) {
      setLocMsg("Saved!")
      router.refresh()
    } else {
      setLocMsg("Could not save")
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={savePrefs} className="space-y-4">
        <h2 className="font-medium">Match preferences</h2>

        <label className="block text-sm">
          Minimum age
          <input
            type="number"
            min={18}
            max={99}
            value={minAge}
            onChange={(e) => setMinAge(Number(e.target.value))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Maximum age
          <input
            type="number"
            min={18}
            max={99}
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Maximum distance (km)
          <input
            type="number"
            min={1}
            max={500}
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <div className="text-sm">
          <span className="block">Show me</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {GENDER_OPTIONS.map((g) => (
              <label key={g} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={seeking.includes(g)}
                  onChange={() => toggleGender(g)}
                />
                {g}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Leave all unchecked to see everyone.
          </p>
        </div>

        <button type="submit" className="w-full rounded bg-black py-2 text-white">
          Save preferences
        </button>
        {prefMsg && <p className="text-sm text-gray-600">{prefMsg}</p>}
      </form>

      <div className="space-y-3 border-t pt-6">
        <h2 className="font-medium">Location</h2>
        <p className="text-sm text-gray-600">
          {lat != null && lng != null
            ? `Set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`
            : "No location set — distance matching stays off until you set it."}
        </p>
        <button
          onClick={useMyLocation}
          className="rounded bg-pink-500 px-4 py-2 text-white"
        >
          Use my location
        </button>

        <label className="block text-sm">
          City (optional label)
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <button onClick={saveCity} className="rounded border px-4 py-2 text-sm">
          Save city
        </button>
        {locMsg && <p className="text-sm text-gray-600">{locMsg}</p>}
      </div>
    </div>
  )
}
