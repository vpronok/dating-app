export const instant = false
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProfileForm from "./profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { photos: { orderBy: { order: "asc" } } },
  })

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Your profile</h1>
      <ProfileForm initialProfile={profile} />
    </main>
  )
}