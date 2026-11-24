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
