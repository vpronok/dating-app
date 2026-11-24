"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Photo = { id: string; url: string; isPrimary: boolean }
type Profile = {
  displayName: string
  bio: string | null
  birthDate: string | Date
  gender: string
  city: string | null
  interests: string[]
  photos: Photo[]
} | null

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? "")
  const [bio, setBio] = useState(initialProfile?.bio ?? "")
  const [birthDate, setBirthDate] = useState(
    initialProfile?.birthDate
      ? new Date(initialProfile.birthDate).toISOString().slice(0, 10)
      : ""
  )
  const [gender, setGender] = useState(initialProfile?.gender ?? "")
  const [city, setCity] = useState(initialProfile?.city ?? "")
  const [interests, setInterests] = useState((initialProfile?.interests ?? []).join(", "))
  const [photos, setPhotos] = useState<Photo[]>(initialProfile?.photos ?? [])
  const [msg, setMsg] = useState("")

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setMsg("Saving...")
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        birthDate,
        gender,
        city,
        interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    })
    const data = await res.json()
    setMsg(res.ok ? "Saved!" : data.error ?? "Error saving")
    if (res.ok) router.refresh()
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg("Uploading photo...")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/profile/photo", { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok) {
      setPhotos((p) => [...p, data.photo])
      setMsg("Photo uploaded!")
    } else {
      setMsg(data.error ?? "Upload failed")
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="Display name"
          value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <textarea className="w-full rounded border px-3 py-2" placeholder="Bio"
          value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        <label className="block text-sm">Birth date
          <input type="date" className="mt-1 w-full rounded border px-3 py-2"
            value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </label>
        <input className="w-full rounded border px-3 py-2" placeholder="Gender"
          value={gender} onChange={(e) => setGender(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" placeholder="City"
          value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" placeholder="Interests (comma-separated)"
          value={interests} onChange={(e) => setInterests(e.target.value)} />
        <button className="w-full rounded bg-black py-2 text-white" type="submit">Save profile</button>
      </form>

      <div>
        <h2 className="mb-2 font-medium">Photos</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {photos.map((p) => (
            <img key={p.id} src={p.url} alt="" className="h-24 w-24 rounded object-cover" />
          ))}
        </div>
        <input type="file" accept="image/*" onChange={uploadPhoto} />
      </div>

      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  )
}