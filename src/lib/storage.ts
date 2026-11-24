import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

export async function saveFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = path.extname(file.name) || ".jpg"
  const filename = `${randomUUID()}${ext}`

  // store OUTSIDE public/
  const dir = path.join(process.cwd(), "uploads")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  // served by the route handler below
  return `/api/uploads/${filename}`
}