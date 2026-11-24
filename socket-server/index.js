import "dotenv/config"
import { createServer } from "http"
import { Server } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { createClient } from "redis"
import jwt from "jsonwebtoken"
import pkg from "pg"

const { Pool } = pkg

const PORT = process.env.PORT || 4000
const SECRET = process.env.SOCKET_JWT_SECRET
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000"

if (!SECRET) {
  console.error("Missing SOCKET_JWT_SECRET")
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
})

// --- Redis adapter (lets multiple socket instances share events) ---
const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()
await Promise.all([pubClient.connect(), subClient.connect()])
io.adapter(createAdapter(pubClient, subClient))
console.log("Redis adapter connected")

// --- Auth middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error("No token"))
  try {
    const payload = jwt.verify(token, SECRET)
    socket.data.userId = payload.sub
    next()
  } catch {
    next(new Error("Invalid token"))
  }
})

// Is this user part of this conversation?
async function isMember(conversationId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM "Conversation" c
     JOIN "Match" m ON m.id = c."matchId"
     WHERE c.id = $1 AND ($2 = m."userAId" OR $2 = m."userBId")
     LIMIT 1`,
    [conversationId, userId]
  )
  return rows.length > 0
}

// Is there a block between the two members of this conversation (either direction)?
async function blockBetween(conversationId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM "Conversation" c
     JOIN "Match" m ON m.id = c."matchId"
     JOIN "Block" b
       ON (b."blockerId" = m."userAId" AND b."blockedId" = m."userBId")
       OR (b."blockerId" = m."userBId" AND b."blockedId" = m."userAId")
     WHERE c.id = $1 LIMIT 1`,
    [conversationId]
  )
  return rows.length > 0
}

io.on("connection", (socket) => {
  const userId = socket.data.userId
  socket.join(`user:${userId}`)
  console.log(`✓ connected: user ${userId} (${socket.id})`)

  socket.on("conversation:join", async ({ conversationId }, ack) => {
    try {
      if (!(await isMember(conversationId, userId))) {
        return ack?.({ error: "Not a member of this conversation" })
      }
      if (await blockBetween(conversationId)) {
        return ack?.({ error: "This conversation is unavailable" })
      }
      socket.join(`conversation:${conversationId}`)
      ack?.({ ok: true })
    } catch (e) {
      console.error("join error", e)
      ack?.({ error: "Server error" })
    }
  })

  socket.on("message:send", async ({ conversationId, content, type, mediaUrl }, ack) => {
    try {
      if (!conversationId) return ack?.({ error: "Invalid payload" })

      const msgType = type === "IMAGE" ? "IMAGE" : "TEXT"
      const text = typeof content === "string" ? content.trim() : ""

      if (msgType === "TEXT") {
        if (!text) return ack?.({ error: "Empty message" })
        if (text.length > 2000) return ack?.({ error: "Message too long" })
      } else {
        if (!mediaUrl || typeof mediaUrl !== "string") {
          return ack?.({ error: "Missing image" })
        }
      }

      if (!(await isMember(conversationId, userId))) {
        return ack?.({ error: "Not a member of this conversation" })
      }
      if (await blockBetween(conversationId)) {
        return ack?.({ error: "This conversation is unavailable" })
      }

      const { rows } = await pool.query(
        `INSERT INTO "Message" (id, "conversationId", "senderId", content, "mediaUrl", type, status, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::"MessageType", 'SENT', now())
         RETURNING id, "conversationId", "senderId", content, "mediaUrl", type, "createdAt"`,
        [conversationId, userId, text, msgType === "IMAGE" ? mediaUrl : null, msgType]
      )
      const message = rows[0]

      await pool.query(
        `UPDATE "Conversation" SET "lastMessageAt" = now() WHERE id = $1`,
        [conversationId]
      )

      io.to(`conversation:${conversationId}`).emit("message:new", message)
      ack?.({ ok: true })
    } catch (e) {
      console.error("message:send error", e)
      ack?.({ error: "Server error" })
    }
  })

  socket.on("disconnect", () => {
    console.log(`✗ disconnected: user ${userId}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on :${PORT}`)
})