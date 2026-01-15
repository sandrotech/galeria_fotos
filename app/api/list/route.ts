import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'

export const runtime = 'nodejs'

function isValidDateDir(name: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name)
}

function guessTypeFromExt(ext: string) {
  const e = ext.toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(e)) return 'image'
  if (['.mp4', '.webm', '.mov', '.m4v', '.avi'].includes(e)) return 'video'
  return 'unknown'
}

export async function GET() {
  const envDir = process.env.UPLOAD_DIR
  const uploadsRoot = envDir
    ? (path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir))
    : path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsRoot)) {
    return NextResponse.json({ dates: [] }, { status: 200 })
  }

  const dates = fs
    .readdirSync(uploadsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isValidDateDir(d.name))
    .map((d) => d.name)
    .sort((a, b) => (a > b ? -1 : 1))

  const result: {
    date: string
    items: { name: string; path: string; type: string; size: number }[]
  }[] = []

  for (const date of dates) {
    const dateDir = path.join(uploadsRoot, date)
    const items = fs
      .readdirSync(dateDir, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => {
        const full = path.join(dateDir, f.name)
        const st = fs.statSync(full)
        const ext = path.extname(f.name)
        const type = guessTypeFromExt(ext)
        const rel = path.relative(uploadsRoot, full).split(path.sep).join('/')
        return {
          name: f.name,
          path: rel,
          type,
          size: st.size,
        }
      })
    result.push({ date, items })
  }

  return NextResponse.json({ dates: result }, { status: 200 })
}
