import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  targetId: z.string().min(1),
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "FAKE_PROFILE",
    "UNDERAGE",
    "OTHER",
  ]),
  details: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { targetId, reason, details } = parsed.data
  if (targetId === session.user.id) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 })
  }

  await prisma.report.create({
    data: { reporterId: session.user.id, reportedId: targetId, reason, details },
  })
  return NextResponse.json({ ok: true })
}