export const instant = false

import { prisma } from "@/lib/prisma"
import ReportActions from "./report-actions"

export default async function AdminReports() {
  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { include: { profile: true } },
      reported: { include: { profile: true } },
    },
    take: 100,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reports</h1>
      {reports.length === 0 && <p className="text-gray-600">No reports.</p>}
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm">
                <div>
                  <span className="font-medium">
                    {r.reported.profile?.displayName ?? r.reported.email}
                  </span>{" "}
                  reported by{" "}
                  <span className="font-medium">
                    {r.reporter.profile?.displayName ?? r.reporter.email}
                  </span>
                </div>
                <div className="mt-1 text-gray-600">
                  Reason: <span className="font-mono">{r.reason}</span>
                </div>
                {r.details && <div className="mt-1 text-gray-600">&ldquo;{r.details}&rdquo;</div>}
                <div className="mt-1 text-xs text-gray-400">
                  Status: {r.status} · {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <ReportActions reportId={r.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
