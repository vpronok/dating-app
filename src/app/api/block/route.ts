import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({ targetId: z.string().min(1) })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })
  const { targetId } = parsed.data
  if (targetId === session.user.id) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 })
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: targetId } },
    update: {},
    create: { blockerId: session.user.id, blockedId: targetId },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  await prisma.block.deleteMany({
    where: { blockerId: session.user.id, blockedId: parsed.data.targetId },
  })
  return NextResponse.json({ ok: true })
}