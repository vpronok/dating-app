import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  minAge: z.number().int().min(18).max(99),
  maxAge: z.number().int().min(18).max(99),
  maxDistanceKm: z.number().int().min(1).max(500),
  seekingGenders: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const pref = await prisma.preference.findUnique({
    where: { userId: session.user.id },
  })
  return NextResponse.json({ preference: pref })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const d = parsed.data
  if (d.minAge > d.maxAge) {
    return NextResponse.json({ error: "Min age cannot exceed max age" }, { status: 400 })
  }

  const pref = await prisma.preference.upsert({
    where: { userId: session.user.id },
    update: {
      minAge: d.minAge,
      maxAge: d.maxAge,
      maxDistanceKm: d.maxDistanceKm,
      seekingGenders: d.seekingGenders,
    },
    create: {
      userId: session.user.id,
      minAge: d.minAge,
      maxAge: d.maxAge,
      maxDistanceKm: d.maxDistanceKm,
      seekingGenders: d.seekingGenders,
    },
  })
  return NextResponse.json({ preference: pref })
}
