import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: { match: true },
  })
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { userAId, userBId } = convo.match
  if (session.user.id !== userAId && session.user.id !== userBId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  return NextResponse.json({ messages })
}