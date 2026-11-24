"use client"

import { useEffect, useRef, useState } from "react"
import { getSocket } from "@/lib/socket"

type Message = {
  id: string
  conversationId: string
  senderId: string
  content: string
  mediaUrl: string | null
  type: "TEXT" | "IMAGE"
  createdAt: string
}

const EMOJIS = [
  "😀","😂","😍","🥰","😎","😘","👍","🔥","❤️","😅",
  "🙈","😉","😭","🎉","✨","💯","🤔","😴","🙏","👀",
]

export default function ChatRoom({
  conversationId,
  meId,
}: {
  conversationId: string
  meId: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [status, setStatus] = useState("connecting…")
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true

    const onNew = (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        )
      }
    }

    async function setup() {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (res.ok && active) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }

      const socket = await getSocket()
      if (!active) return

      socket.on("message:new", onNew)

      socket.emit(
        "conversation:join",
        { conversationId },
        (ack: { ok?: boolean; error?: string }) => {
          if (active) setStatus(ack?.ok ? "connected" : ack?.error ?? "join failed")
        }
      )
    }

    setup()

    return () => {
      active = false
      getSocket().then((s) => s.off("message:new", onNew))
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendText(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setText("")
    setShowEmoji(false)
    const socket = await getSocket()
    socket.emit(
      "message:send",
      { conversationId, type: "TEXT", content },
      (ack: { ok?: boolean; error?: string }) => {
        if (ack?.error) setStatus(ack.error)
      }
    )
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus("uploading image…")

    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/chat/upload", { method: "POST", body: fd })
    const data = await res.json()

    if (e.target) e.target.value = "" // allow re-selecting the same file

    if (!res.ok) {
      setStatus(data.error ?? "upload failed")
      return
    }

    const socket = await getSocket()
    socket.emit(
      "message:send",
      { conversationId, type: "IMAGE", mediaUrl: data.url, content: "" },
      (ack: { ok?: boolean; error?: string }) => {
        setStatus(ack?.error ?? "connected")
      }
    )
  }

  function addEmoji(emoji: string) {
    setText((t) => t + emoji)
  }

  return (
    <>
      <div className="mb-2 text-xs text-gray-500">{status}</div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-lg text-sm ${
              m.senderId === meId
                ? "ml-auto bg-pink-500 text-white"
                : "bg-gray-100"
            } ${m.type === "IMAGE" ? "p-1" : "px-3 py-2"}`}
          >
            {m.type === "IMAGE" && m.mediaUrl ? (
              <img src={m.mediaUrl} alt="" className="max-h-60 rounded-md" />
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className="mt-2 flex flex-wrap gap-1 rounded border p-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-xl hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={sendText} className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          className="rounded border px-3 py-2"
          title="Emoji"
        >
          😊
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded border px-3 py-2"
          title="Send photo"
        >
          📷
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={sendImage}
          className="hidden"
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Send
        </button>
      </form>
    </>
  )
}