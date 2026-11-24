import { auth } from "@/auth"

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }

export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" }
  }
  return { ok: true, userId: session.user.id }
}
