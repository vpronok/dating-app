import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["approve", "reject"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED"
  await prisma.photo.update({ where: { id }, data: { status } })

  return NextResponse.json({ ok: true })
}
