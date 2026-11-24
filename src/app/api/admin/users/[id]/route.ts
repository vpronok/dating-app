import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["suspend", "activate"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  await prisma.user.update({
    where: { id },
    data: { isActive: parsed.data.action === "activate" },
  })

  return NextResponse.json({ ok: true })
}
