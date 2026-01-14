import { NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import crypto from 'node:crypto'
import Busboy from 'busboy'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 300 * 1024 * 1024
const MAX_FILES = 5

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true })
  }
}

function sanitizeFilename(name: string) {
  const base = path.basename(name)
  return base.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') || ''
  if (!ct.toLowerCase().includes('multipart/form-data')) {
    return NextResponse.json(
      { success: false, errors: ['Conteúdo inválido: use multipart/form-data'] },
      { status: 400 }
    )
  }

  const uploadsRoot = path.join(process.cwd(), 'uploads')
  ensureDir(uploadsRoot)
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const dateDir = path.join(uploadsRoot, `${yyyy}-${mm}-${dd}`)
  ensureDir(dateDir)

  const saved: { name: string; path: string; type: string; size: number }[] = []
  const errors: string[] = []

  const nodeStream = Readable.fromWeb(req.body as unknown as ReadableStream)

  await new Promise<void>((resolve, reject) => {
    const bb = Busboy({
      headers: { 'content-type': ct },
      limits: { files: MAX_FILES },
    })

    bb.on('file', (_fieldname, file, info) => {
      const mime = info.mimeType || info.mimetype || ''
      const isImage = mime.startsWith('image/')
      const isVideo = mime.startsWith('video/')
      if (!isImage && !isVideo) {
        errors.push(`Tipo não permitido: ${mime}`)
        file.resume()
        return
      }

      const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
      const safeOriginal = sanitizeFilename(info.filename || 'arquivo')
      const finalName = `${crypto.randomUUID()}-${safeOriginal}`
      const finalPath = path.join(dateDir, finalName)

      let received = 0
      let tooLarge = false
      const ws = fs.createWriteStream(finalPath)

      file.on('data', (chunk) => {
        received += chunk.length
        if (received > maxBytes) {
          tooLarge = true
          ws.destroy()
        } else {
          ws.write(chunk)
        }
      })

      file.on('end', () => {
        if (tooLarge) {
          if (fs.existsSync(finalPath)) {
            try { fs.unlinkSync(finalPath) } catch {}
          }
          errors.push(
            isImage
              ? `Foto excede 10MB: ${safeOriginal}`
              : `Vídeo excede 300MB: ${safeOriginal}`
          )
          return
        }
        ws.end()
        const rel = path.relative(process.cwd(), finalPath).split(path.sep).join('/')
        saved.push({
          name: finalName,
          path: rel,
          type: mime,
          size: received,
        })
      })

      file.on('error', (err) => {
        try { ws.destroy() } catch {}
        errors.push(`Erro ao salvar ${safeOriginal}: ${err.message}`)
      })
    })

    bb.on('filesLimit', () => {
      errors.push(`Máximo de ${MAX_FILES} arquivos por envio`)
    })

    bb.on('error', (err) => reject(err))
    bb.on('finish', () => resolve())

    nodeStream.pipe(bb)
  }).catch((err) => {
    errors.push(`Erro ao processar upload: ${String(err)}`)
  })

  if (saved.length === 0 && errors.length > 0) {
    return NextResponse.json(
      { success: false, errors },
      { status: 400 }
    )
  }

  const message =
    errors.length === 0
      ? 'Arquivos recebidos com carinho. Obrigado!'
      : 'Upload concluído com avisos.'

  return NextResponse.json({
    success: true,
    files: saved,
    errors: errors.length ? errors : undefined,
    message,
  })
}
