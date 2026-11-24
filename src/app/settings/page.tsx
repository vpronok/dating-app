export const instant = false

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import SettingsForm from "./settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [pref, profile] = await Promise.all([
    prisma.preference.findUnique({ where: { userId: session.user.id } }),
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        latitude: true,
        longitude: true,
        city: true,
        locationUpdatedAt: true,
      },
    }),
  ])

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <SettingsForm
        initialPref={
          pref
            ? {
                minAge: pref.minAge,
                maxAge: pref.maxAge,
                maxDistanceKm: pref.maxDistanceKm,
                seekingGenders: pref.seekingGenders,
              }
            : null
        }
        initialLocation={
          profile
            ? {
                latitude: profile.latitude,
                longitude: profile.longitude,
                city: profile.city,
                locationUpdatedAt: profile.locationUpdatedAt
                  ? profile.locationUpdatedAt.toISOString()
                  : null,
              }
            : null
        }
      />
    </main>
  )
}
