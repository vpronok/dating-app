export const instant = false

import { prisma } from "@/lib/prisma"
import PhotoActions from "./photo-actions"

export default async function AdminPhotos() {
  const photos = await prisma.photo.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { profile: { include: { user: true } } },
    take: 100,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Pending photos</h1>
      {photos.length === 0 && <p className="text-gray-600">No photos awaiting review.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="rounded-lg border p-2">
            <img src={p.url} alt="" className="h-40 w-full rounded object-cover" />
            <div className="mt-1 text-xs text-gray-500">
              {p.profile.displayName}
            </div>
            <PhotoActions photoId={p.id} />
          </div>
        ))}
      </div>
    </div>
  )
}
