# Task: Implement the Admin Panel + Photo Moderation (Step 9A)

## Project context (read first)
This is a dating-app web project at the repo root you're in. Stack:
- Next.js 16 (App Router, Turbopack, Cache Components enabled — dynamic pages use `export const instant = false`)
- Auth.js v5 (NextAuth beta) with Credentials provider, JWT session strategy, Prisma adapter
- Prisma 7 with the `@prisma/adapter-pg` driver adapter; client singleton at `src/lib/prisma.ts`
- PostgreSQL; path alias `@/` -> `src/`
- Existing models include User (with `role` UserRole {MEMBER,ADMIN} and `isActive` Boolean), Profile, Photo (status PhotoStatus {PENDING,APPROVED,REJECTED}), Report (status ReportStatus {PENDING,REVIEWED,ACTIONED,DISMISSED}), Block, Match, Conversation, Message.

## What to do
Create/overwrite EXACTLY the files below with the EXACT contents given (do not improvise or "improve" them). 12 are new; 4 overwrite existing files (src/auth.ts, src/auth.config.ts, src/app/api/discover/route.ts, src/app/matches/page.tsx).

- NO Prisma schema change and NO migration are needed — this step only uses existing models/enums/fields.
- Do not modify any files other than those listed.
- Preserve the literal `[id]` bracketed folder names (Next.js dynamic route segments).

After writing the files, print (do NOT run) these follow-up steps for me:
1. Promote an admin (replace email), then log out and back in:
   sudo -u postgres psql -d dating_db -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
2. Restart Next so new routes + regenerated auth load:
   rm -rf .next && npm run dev

---

## Files

### `src/lib/admin.ts`

```ts
import { auth } from "@/auth"

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }

export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" }
  }
  return { ok: true, userId: session.user.id }
}
```

### `src/app/admin/layout.tsx`

```tsx
export const instant = false

import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/")

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link href="/admin" className="font-semibold">Dashboard</Link>
        <Link href="/admin/reports" className="hover:underline">Reports</Link>
        <Link href="/admin/photos" className="hover:underline">Photos</Link>
        <Link href="/admin/users" className="hover:underline">Users</Link>
      </header>
      {children}
    </div>
  )
}
```

### `src/app/admin/page.tsx`

```tsx
export const instant = false

import { prisma } from "@/lib/prisma"

export default async function AdminDashboard() {
  const [pendingReports, pendingPhotos, totalUsers, totalMatches, suspended] =
    await Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.photo.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.match.count(),
      prisma.user.count({ where: { isActive: false } }),
    ])

  const stats = [
    { label: "Pending reports", value: pendingReports },
    { label: "Pending photos", value: pendingPhotos },
    { label: "Total users", value: totalUsers },
    { label: "Total matches", value: totalMatches },
    { label: "Suspended users", value: suspended },
  ]

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-4">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### `src/app/admin/reports/page.tsx`

```tsx
export const instant = false

import { prisma } from "@/lib/prisma"
import ReportActions from "./report-actions"

export default async function AdminReports() {
  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { include: { profile: true } },
      reported: { include: { profile: true } },
    },
    take: 100,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reports</h1>
      {reports.length === 0 && <p className="text-gray-600">No reports.</p>}
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm">
                <div>
                  <span className="font-medium">
                    {r.reported.profile?.displayName ?? r.reported.email}
                  </span>{" "}
                  reported by{" "}
                  <span className="font-medium">
                    {r.reporter.profile?.displayName ?? r.reporter.email}
                  </span>
                </div>
                <div className="mt-1 text-gray-600">
                  Reason: <span className="font-mono">{r.reason}</span>
                </div>
                {r.details && <div className="mt-1 text-gray-600">&ldquo;{r.details}&rdquo;</div>}
                <div className="mt-1 text-xs text-gray-400">
                  Status: {r.status} · {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <ReportActions reportId={r.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### `src/app/admin/reports/report-actions.tsx`

```tsx
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
```

### `src/app/admin/photos/page.tsx`

```tsx
export const instant = false

import { prisma } from "@/lib/prisma"
import PhotoActions from "./photo-actions"

export default async function AdminPhotos() {
  const photos = await prisma.photo.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { profile: { include: { user: true } } },
    take: 100,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Pending photos</h1>
      {photos.length === 0 && <p className="text-gray-600">No photos awaiting review.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="rounded-lg border p-2">
            <img src={p.url} alt="" className="h-40 w-full rounded object-cover" />
            <div className="mt-1 text-xs text-gray-500">
              {p.profile.displayName}
            </div>
            <PhotoActions photoId={p.id} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### `src/app/admin/photos/photo-actions.tsx`

```tsx
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
```

### `src/app/admin/users/page.tsx`

```tsx
export const instant = false

import { prisma } from "@/lib/prisma"
import UserActions from "./user-actions"

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: true },
    take: 200,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Users</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.profile?.displayName ?? "—"}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <span className={u.isActive ? "text-green-600" : "text-red-600"}>
                  {u.isActive ? "Active" : "Suspended"}
                </span>
              </td>
              <td>
                <UserActions userId={u.id} isActive={u.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### `src/app/admin/users/user-actions.tsx`

```tsx
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
```

### `src/app/api/admin/reports/[id]/route.ts`

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["dismiss", "review", "ban"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (parsed.data.action === "dismiss") {
    await prisma.report.update({ where: { id }, data: { status: "DISMISSED" } })
  } else if (parsed.data.action === "review") {
    await prisma.report.update({ where: { id }, data: { status: "REVIEWED" } })
  } else {
    await prisma.$transaction([
      prisma.report.update({ where: { id }, data: { status: "ACTIONED" } }),
      prisma.user.update({ where: { id: report.reportedId }, data: { isActive: false } }),
    ])
  }

  return NextResponse.json({ ok: true })
}
```

### `src/app/api/admin/photos/[id]/route.ts`

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["approve", "reject"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED"
  await prisma.photo.update({ where: { id }, data: { status } })

  return NextResponse.json({ ok: true })
}
```

### `src/app/api/admin/users/[id]/route.ts`

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["suspend", "activate"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  await prisma.user.update({
    where: { id },
    data: { isActive: parsed.data.action === "activate" },
  })

  return NextResponse.json({ ok: true })
}
```

### `src/auth.config.ts`

```ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPaths = ["/profile", "/matches", "/chat", "/discover", "/admin"]
      const isProtected = protectedPaths.some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (isProtected && !isLoggedIn) {
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
```

### `src/auth.ts`

```ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null
        if (!user.isActive) return null // suspended users can't log in

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
})
```

### `src/app/api/discover/route.ts`

```ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { haversineKm } from "@/lib/geo"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const meId = session.user.id

  const me = await prisma.profile.findUnique({ where: { userId: meId } })
  if (!me) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 })
  }

  const pref = await prisma.preference.findUnique({ where: { userId: meId } })
  const minAge = pref?.minAge ?? 18
  const maxAge = pref?.maxAge ?? 99
  const maxDistanceKm = pref?.maxDistanceKm ?? 50
  const seekingGenders = pref?.seekingGenders ?? []

  const swiped = await prisma.swipe.findMany({
    where: { swiperId: meId },
    select: { swipeeId: true },
  })
  const swipedIds = swiped.map((s) => s.swipeeId)

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
    select: { blockerId: true, blockedId: true },
  })
  const blockedIds = blocks.map((b) => (b.blockerId === meId ? b.blockedId : b.blockerId))

  const excludeIds = [...new Set([...swipedIds, ...blockedIds])]

  const now = new Date()
  const maxBirth = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate())
  const minBirth = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate())

  const candidates = await prisma.profile.findMany({
    where: {
      userId: { not: meId, notIn: excludeIds },
      user: { isActive: true },
      birthDate: { lte: maxBirth, gte: minBirth },
      ...(seekingGenders.length > 0 ? { gender: { in: seekingGenders } } : {}),
    },
    include: {
      photos: {
        where: { status: { not: "REJECTED" } },
        orderBy: { order: "asc" },
      },
    },
    take: 200,
  })

  const results = candidates
    .map((c) => {
      let distanceKm: number | null = null
      if (
        me.latitude != null && me.longitude != null &&
        c.latitude != null && c.longitude != null
      ) {
        distanceKm = Math.round(
          haversineKm(me.latitude, me.longitude, c.latitude, c.longitude)
        )
      }
      const age = Math.floor(
        (now.getTime() - new Date(c.birthDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
      return {
        userId: c.userId,
        displayName: c.displayName,
        bio: c.bio,
        city: c.city,
        age,
        interests: c.interests,
        photos: c.photos.map((p) => p.url),
        distanceKm,
      }
    })
    .filter((c) => {
      if (me.latitude == null || me.longitude == null) return true
      if (c.distanceKm == null) return false
      return c.distanceKm <= maxDistanceKm
    })
    .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
    .slice(0, 20)

  return NextResponse.json({ candidates: results })
}
```

### `src/app/matches/page.tsx`

```tsx
export const instant = false

import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function MatchesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const meId = session.user.id

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    include: {
      conversation: true,
      userA: { include: { profile: { include: { photos: { where: { status: { not: "REJECTED" } } } } } } },
      userB: { include: { profile: { include: { photos: { where: { status: { not: "REJECTED" } } } } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  const blockRows = await prisma.block.findMany({
    where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
    select: { blockerId: true, blockedId: true },
  })
  const blockedIds = new Set(
    blockRows.map((b) => (b.blockerId === meId ? b.blockedId : b.blockerId))
  )

  const rows = matches
    .map((m) => {
      const other = m.userAId === meId ? m.userB : m.userA
      return {
        conversationId: m.conversation?.id,
        otherId: other.id,
        name: other.profile?.displayName ?? "Unknown",
        photo: other.profile?.photos?.[0]?.url ?? null,
      }
    })
    .filter((r) => !blockedIds.has(r.otherId))

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Your matches</h1>
      {rows.length === 0 && (
        <p className="text-gray-600">No matches yet. Keep swiping!</p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.conversationId}>
            <Link
              href={`/chat/${r.conversationId}`}
              className="flex items-center gap-3 rounded border p-3 hover:bg-gray-50"
            >
              {r.photo ? (
                <img src={r.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200" />
              )}
              <span className="font-medium">{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```
