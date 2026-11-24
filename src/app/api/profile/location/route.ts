import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().max(100).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) {
    return NextResponse.json({ error: "Create your profile first" }, { status: 400 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
  }
  const { latitude, longitude, city } = parsed.data

  await prisma.profile.update({
    where: { userId: session.user.id },
    data: {
      latitude,
      longitude,
      ...(city ? { city } : {}),
      locationUpdatedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
