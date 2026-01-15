'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

type ApiResponse = {
  success: boolean
  files?: { name: string; path: string; type: string; size: number }[]
  errors?: string[]
  message?: string
}

export default function Home() {
  const coupleNames = 'Lorena & Alessandro'
  const eventDate = '20 de jan de 2026'
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [durations, setDurations] = useState<number[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    const limited = selected.slice(0, 5)
    setFiles(limited)
    setDurations(new Array(limited.length).fill(0))
    setMessage(null)
    setErrors([])
    if (selected.length > 5) {
      setErrors(['Máximo de 5 arquivos por envio'])
    }
  }

  const previews = useMemo(() => {
    return files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      isImage: f.type.startsWith('image/'),
      isVideo: f.type.startsWith('video/'),
    }))
  }, [files])

  const counts = useMemo(() => {
    const images = files.filter((f) => f.type.startsWith('image/')).length
    const videos = files.filter((f) => f.type.startsWith('video/')).length
    return { images, videos }
  }, [files])

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  function uploadOnce(onDone: () => void, onError: () => void) {
    if (files.length === 0 || uploading) return
    setUploading(true)
    setProgress(0)
    setMessage(null)
    setErrors([])

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setProgress(percent)
      }
    }

    xhr.onload = () => {
      setUploading(false)
      setProgress(100)
      try {
        const data: ApiResponse = JSON.parse(xhr.responseText)
        if (data.success) {
          setMessage(data.message ?? 'Obrigado! Seus arquivos foram recebidos.')
          setFiles([])
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 2000)
          onDone()
        } else {
          setErrors(data.errors ?? ['Falha ao enviar os arquivos'])
          onError()
        }
      } catch {
        setErrors(['Resposta inválida do servidor'])
        onError()
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setErrors(['Conexão instável. Tentando novamente...'])
      onError()
    }

    xhr.send(formData)
  }

  function handleUpload() {
    let retries = 2
    function done() { }
    function fail() {
      if (retries > 0) {
        retries -= 1
        setTimeout(() => uploadOnce(done, fail), 1000 * (3 - retries))
      }
    }
    uploadOnce(done, fail)
  }

  function handlePrimaryCTA() {
    if (uploading) return
    if (files.length === 0) {
      inputRef.current?.click()
    } else {
      handleUpload()
    }
  }

  function formatDuration(d: number) {
    const m = Math.floor(d / 60)
    const s = Math.floor(d % 60)
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <img
          src="/casal.jpg"
          alt=""
          className={styles.bgImg}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className={styles.bgOverlay} />
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className={styles.titleLabel}>Casamento de</span>
          <span className={styles.names}>{coupleNames}</span>
          <span className={styles.hearts}>💞</span>
          <span className={styles.ring}>💍</span>
        </h1>
        <p className={styles.subtitle}>
          Ajude a guardar esse momento 💖
          <br />
          Envie as fotos e vídeos que você registrou hoje
        </p>
        <p className={styles.eventInfo}>{eventDate}</p>

        <input
          id="files"
          className={styles.fileInput}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          ref={inputRef}
        />
        <button
          onClick={handlePrimaryCTA}
          disabled={uploading}
          className={styles.primaryButton}
          aria-label="Enviar fotos e vídeos"
        >
          {uploading
            ? 'Enviando seus momentos…'
            : files.length === 0
              ? 'Enviar fotos e vídeos'
              : 'Confirmar envio'}
        </button>

        <p className={styles.instructions}>
          Vídeos curtinhos são perfeitos 🎥 • A qualidade é mantida ✨
        </p>

        {files.length > 0 && (
          <p className={styles.selectedInfo}>
            {counts.images} {counts.images === 1 ? 'foto' : 'fotos'} • {counts.videos}{' '}
            {counts.videos === 1 ? 'vídeo' : 'vídeos'}
          </p>
        )}

        {previews.length > 0 && (
          <div className={styles.previews}>
            {previews.map((p, i) => (
              <div key={i} className={styles.thumb}>
                {p.isImage && <img src={p.url} alt={p.file.name} />}
                {p.isVideo && (
                  <>
                    <video
                      src={p.url}
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget
                        setDurations((d) => {
                          const next = d.slice()
                          next[i] = v.duration || 0
                          return next
                        })
                      }}
                    />
                    <span className={styles.badge}>
                      🎥 {formatDuration(durations[i] || 0)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className={styles.progress}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {message && <p className={`${styles.message} ${styles.success}`}>✅ {message}</p>}
        {errors.length > 0 && (
          <p className={`${styles.message} ${styles.error}`}>
            ❌ {errors.join(' • ')}
          </p>
        )}

        {message && <p className={styles.thanks}>🎉 Obrigado! Veja o que já foi compartilhado</p>}

        {message && (
          <p className={styles.subtitle}>
            <Link href="/galeria">Ver fotos que já enviaram</Link>
          </p>
        )}

        {showConfetti && <div className={styles.confetti} aria-hidden="true" />}
      </div>
    </main>
  )
}
