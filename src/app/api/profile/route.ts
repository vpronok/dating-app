import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  birthDate: z.string(), // ISO date from the form
  gender: z.string().min(1),
  city: z.string().optional(),
  interests: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { photos: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ profile })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data
  const birthDate = new Date(data.birthDate)

  // enforce 18+
  const age = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (age < 18) {
    return NextResponse.json({ error: "You must be at least 18" }, { status: 400 })
  }

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {
      displayName: data.displayName,
      bio: data.bio,
      birthDate,
      gender: data.gender,
      city: data.city,
      interests: data.interests,
    },
    create: {
      userId: session.user.id,
      displayName: data.displayName,
      bio: data.bio,
      birthDate,
      gender: data.gender,
      city: data.city,
      interests: data.interests,
    },
  })

  return NextResponse.json({ profile })
}