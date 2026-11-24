export const instant = false

import { prisma } from "@/lib/prisma"
import UserActions from "./user-actions"

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: true },
    take: 200,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Users</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.profile?.displayName ?? "—"}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <span className={u.isActive ? "text-green-600" : "text-red-600"}>
                  {u.isActive ? "Active" : "Suspended"}
                </span>
              </td>
              <td>
                <UserActions userId={u.id} isActive={u.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
