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
