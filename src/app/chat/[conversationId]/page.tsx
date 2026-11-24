export const instant = false

import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ChatRoom from "./chat-room"
import ChatHeader from "./chat-header"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { conversationId } = await params

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        include: {
          userA: { include: { profile: true } },
          userB: { include: { profile: true } },
        },
      },
    },
  })
  if (!convo) notFound()

  const { userAId, userBId } = convo.match
  if (session.user.id !== userAId && session.user.id !== userBId) {
    redirect("/matches")
  }

  const other = convo.match.userAId === session.user.id ? convo.match.userB : convo.match.userA
  const otherName = other.profile?.displayName ?? "User"

  return (
    <main className="mx-auto flex h-screen max-w-md flex-col p-4">
      <ChatHeader otherUserId={other.id} otherName={otherName} />
      <ChatRoom conversationId={conversationId} meId={session.user.id} />
    </main>
  )
}