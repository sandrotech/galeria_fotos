'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

type ApiResponse = {
  success: boolean
  files?: { name: string; path: string; type: string; size: number }[]
  errors?: string[]
  message?: string
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    const limited = selected.slice(0, 5)
    setFiles(limited)
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

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  function handleUpload() {
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
        } else {
          setErrors(data.errors ?? ['Falha ao enviar os arquivos'])
        }
      } catch {
        setErrors(['Resposta inválida do servidor'])
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setErrors(['Erro de rede ao enviar os arquivos'])
    }

    xhr.send(formData)
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>💍 Nosso Casamento</h1>
        <p className={styles.subtitle}>
          Envie fotos e vídeos para celebrarmos este momento especial 💖
        </p>

        <input
          id="files"
          className={styles.fileInput}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
        <label htmlFor="files" className={styles.uploadButton} role="button" aria-label="Selecionar fotos e vídeos">
          📸🎥 Selecionar fotos e vídeos
        </label>

        <p className={styles.instructions}>
          Vídeos curtos são perfeitos 💙 • Fotos guardam cada detalhe
        </p>

        {files.length > 0 && (
          <p className={styles.selectedInfo}>
            {files.length} arquivo(s) selecionado(s)
          </p>
        )}

        {previews.length > 0 && (
          <div className={styles.previews}>
            {previews.map((p, i) => (
              <div key={i} className={styles.thumb}>
                {p.isImage && <img src={p.url} alt={p.file.name} />}
                {p.isVideo && <video src={p.url} muted playsInline />}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={styles.primaryButton}
        >
          {uploading ? 'Enviando...' : 'Enviar arquivos'}
        </button>

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

        {message && <p className={styles.thanks}>Obrigado por compartilhar esse momento!</p>}

        <p className={styles.subtitle}>
          <Link href="/galeria">Ver galeria dos noivos</Link>
        </p>
      </div>
    </main>
  )
}
