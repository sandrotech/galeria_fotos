import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'

export const runtime = 'nodejs'

function isSafePath(p: string) {
    const norm = p.replace(/\\/g, '/')
    return norm.startsWith('uploads/') && !norm.includes('..')
}

function mimeFromExt(ext: string) {
    const e = ext.toLowerCase()
    if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
    if (e === '.png') return 'image/png'
    if (e === '.gif') return 'image/gif'
    if (e === '.webp') return 'image/webp'
    if (e === '.mp4') return 'video/mp4'
    if (e === '.webm') return 'video/webm'
    if (e === '.mov') return 'video/quicktime'
    if (e === '.m4v') return 'video/x-m4v'
    if (e === '.avi') return 'video/x-msvideo'
    return 'application/octet-stream'
}

function nodeToWeb(stream: fs.ReadStream): ReadableStream {
    return new ReadableStream({
        start(controller) {
            stream.on('data', (chunk) => controller.enqueue(chunk))
            stream.on('end', () => controller.close())
            stream.on('error', (err) => controller.error(err))
        },
        cancel() {
            try { stream.destroy() } catch { }
        },
    })
}

export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('p') || ''
    const p = raw.replace(/\\/g, '/')
    if (!isSafePath(p)) {
        return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 })
    }

    const abs = path.join(process.cwd(), p)
    if (!fs.existsSync(abs)) {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const stat = fs.statSync(abs)
    const ext = path.extname(abs)
    const mime = mimeFromExt(ext)
    const range = req.headers.get('range')

    if (mime.startsWith('video/') && range) {
        const match = /bytes=(\d+)-(\d+)?/.exec(range)
        const start = match ? parseInt(match[1], 10) : 0
        const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1
        if (start >= stat.size) {
            return new NextResponse(null, {
                status: 416,
                headers: {
                    'Content-Range': `bytes */${stat.size}`,
                },
            })
        }
        const chunkSize = end - start + 1
        const stream = fs.createReadStream(abs, { start, end })
        const webStream = nodeToWeb(stream)
        return new NextResponse(webStream, {
            status: 206,
            headers: {
                'Content-Type': mime,
                'Content-Length': String(chunkSize),
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Cache-Control': 'no-store',
            },
        })
    }

    const stream = fs.createReadStream(abs)
    const webStream = nodeToWeb(stream)
    return new NextResponse(webStream, {
        status: 200,
        headers: {
            'Content-Type': mime,
            'Cache-Control': 'no-store',
        },
    })
}
