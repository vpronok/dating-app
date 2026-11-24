export const instant = false

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import SwipeDeck from "./swipe-deck"

export default async function DiscoverPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Discover</h1>
      <SwipeDeck />
    </main>
  )
}