import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { saveFile } from "@/lib/storage"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) {
    return NextResponse.json({ error: "Create your profile first" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // basic validation
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 })
  }

  const url = await saveFile(file)

  const count = await prisma.photo.count({ where: { profileId: profile.id } })

  const photo = await prisma.photo.create({
    data: {
      profileId: profile.id,
      url,
      order: count,
      isPrimary: count === 0, // first photo is primary
    },
  })

  return NextResponse.json({ photo })
}