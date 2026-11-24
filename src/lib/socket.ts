"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket

  // fetch a fresh short-lived token from our Next API
  const res = await fetch("/api/socket-token")
  if (!res.ok) throw new Error("Could not get socket token (are you logged in?)")
  const { token } = await res.json()

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return socket
}