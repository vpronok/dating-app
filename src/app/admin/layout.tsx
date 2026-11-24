export const instant = false

import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/")

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link href="/admin" className="font-semibold">Dashboard</Link>
        <Link href="/admin/reports" className="hover:underline">Reports</Link>
        <Link href="/admin/photos" className="hover:underline">Photos</Link>
        <Link href="/admin/users" className="hover:underline">Users</Link>
      </header>
      {children}
    </div>
  )
}
