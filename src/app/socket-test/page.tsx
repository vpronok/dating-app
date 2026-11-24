"use client"

import { useState } from "react"
import { getSocket } from "@/lib/socket"

export default function SocketTest() {
  const [status, setStatus] = useState("idle")
  const [reply, setReply] = useState("")

  async function connect() {
    setStatus("connecting…")
    try {
      const socket = await getSocket()
      socket.on("connect", () => setStatus("connected: " + socket.id))
      socket.on("connect_error", (e) => setStatus("error: " + e.message))
      if (socket.connected) setStatus("connected: " + socket.id)
    } catch (e) {
      setStatus("failed: " + (e as Error).message)
    }
  }

  async function sendPing() {
    const socket = await getSocket()
    socket.emit("ping:test", "hello from client", (res: unknown) => {
      setReply(JSON.stringify(res))
    })
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Socket test</h1>
      <div className="flex gap-2">
        <button onClick={connect} className="rounded bg-black px-4 py-2 text-white">Connect</button>
        <button onClick={sendPing} className="rounded border px-4 py-2">Send ping</button>
      </div>
      <p>Status: <span className="font-mono">{status}</span></p>
      <p>Reply: <span className="font-mono">{reply}</span></p>
    </main>
  )
}