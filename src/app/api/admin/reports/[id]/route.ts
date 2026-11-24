import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const schema = z.object({ action: z.enum(["dismiss", "review", "ban"]) })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status })

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (parsed.data.action === "dismiss") {
    await prisma.report.update({ where: { id }, data: { status: "DISMISSED" } })
  } else if (parsed.data.action === "review") {
    await prisma.report.update({ where: { id }, data: { status: "REVIEWED" } })
  } else {
    await prisma.$transaction([
      prisma.report.update({ where: { id }, data: { status: "ACTIONED" } }),
      prisma.user.update({ where: { id: report.reportedId }, data: { isActive: false } }),
    ])
  }

  return NextResponse.json({ ok: true })
}
