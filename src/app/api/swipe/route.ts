import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  swipeeId: z.string().min(1),
  type: z.enum(["LIKE", "PASS", "SUPERLIKE"]),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const meId = session.user.id

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { swipeeId, type } = parsed.data

  if (swipeeId === meId) {
    return NextResponse.json({ error: "Cannot swipe yourself" }, { status: 400 })
  }

  // record (or update) my decision
  await prisma.swipe.upsert({
    where: { swiperId_swipeeId: { swiperId: meId, swipeeId } },
    update: { type },
    create: { swiperId: meId, swipeeId, type },
  })

  if (type === "PASS") {
    return NextResponse.json({ match: false })
  }

  // did they already like me?
  const reciprocal = await prisma.swipe.findUnique({
    where: { swiperId_swipeeId: { swiperId: swipeeId, swipeeId: meId } },
  })
  const likedBack =
    reciprocal && (reciprocal.type === "LIKE" || reciprocal.type === "SUPERLIKE")

  if (!likedBack) {
    return NextResponse.json({ match: false })
  }

  // it's a match — store with consistent ordering, create the conversation
  const [userAId, userBId] = [meId, swipeeId].sort()

  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: {
      userAId,
      userBId,
      conversation: { create: {} },
    },
  })

  return NextResponse.json({ match: true, matchId: match.id })
}