export const instant = false

import { prisma } from "@/lib/prisma"

export default async function AdminDashboard() {
  const [pendingReports, pendingPhotos, totalUsers, totalMatches, suspended] =
    await Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.photo.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.match.count(),
      prisma.user.count({ where: { isActive: false } }),
    ])

  const stats = [
    { label: "Pending reports", value: pendingReports },
    { label: "Pending photos", value: pendingPhotos },
    { label: "Total users", value: totalUsers },
    { label: "Total matches", value: totalMatches },
    { label: "Suspended users", value: suspended },
  ]

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-4">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
