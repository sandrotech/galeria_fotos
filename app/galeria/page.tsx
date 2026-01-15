'use client'

import styles from './page.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'

type Item = { name: string; path: string; type: string; size: number }
type Group = { date: string; items: Item[] }

const isImage = (t: string) => t === 'image'
const isVideo = (t: string) => t === 'video'

export default function Galeria() {
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const viewerVideoRef = useRef<HTMLVideoElement | null>(null)

  /* =====================
    LOAD
  ===================== */
  useEffect(() => {
    fetch('/api/list', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar galeria')
        return r.json()
      })
      .then((data) => setGroups(data?.dates || []))
      .catch((e) => setError(e.message))
  }, [])

  const allItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  )

  /* =====================
    VIEWER CONTROL
  ===================== */
  function openViewerByPath(path: string) {
    const index = allItems.findIndex((i) => i.path === path)
    if (index >= 0) setViewerIndex(index)
  }

  function closeViewer() {
    setViewerIndex(null)
  }

  function prevItem() {
    setViewerIndex((i) =>
      i === null ? null : (i - 1 + allItems.length) % allItems.length
    )
  }

  function nextItem() {
    setViewerIndex((i) =>
      i === null ? null : (i + 1) % allItems.length
    )
  }

  /* =====================
    KEYBOARD NAV
  ===================== */
  useEffect(() => {
    if (viewerIndex === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer()
      if (e.key === 'ArrowLeft') prevItem()
      if (e.key === 'ArrowRight') nextItem()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex])

  /* =====================
    RENDER
  ===================== */
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>💞 Galeria dos Noivos</h1>
        <p className={styles.subtitle}>
          As memórias enviadas pelos convidados
        </p>
      </header>

      {error && <p className={styles.empty}>❌ {error}</p>}
      {!error && groups.length === 0 && (
        <p className={styles.empty}>Ainda não há arquivos enviados.</p>
      )}

      {groups.map((group) => (
        <section key={group.date} className={styles.section}>
          <h2 className={styles.sectionTitle}>{group.date}</h2>

          <div className={styles.grid}>
            {group.items.map((item) => {
              const src = `/api/media?p=${encodeURIComponent(item.path)}`

              return (
                <div
                  key={item.path}
                  className={styles.item}
                  onClick={() => openViewerByPath(item.path)}
                >
                  {isImage(item.type) && (
                    <img
                      src={src}
                      alt={item.name}
                      loading="lazy"
                    />
                  )}

                  {isVideo(item.type) && (
                    <div className={styles.videoThumb}>
                      <video
                        src={src}
                        muted
                        preload="metadata"
                        playsInline
                      />
                      <span className={styles.playOverlay}>▶</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* =====================
          VIEWER (GALERIA)
      ===================== */}
      {viewerIndex !== null && allItems[viewerIndex] && (
        <div
          className={styles.viewer}
          role="dialog"
          aria-modal="true"
          onClick={closeViewer}
        >
          <div
            className={styles.viewerBody}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <header className={styles.viewerHeader}>
              <strong>{allItems[viewerIndex].name}</strong>
              <span>
                {viewerIndex + 1} de {allItems.length}
              </span>
            </header>

            {/* NAV */}
            <button
              className={styles.viewerClose}
              onClick={closeViewer}
              aria-label="Fechar"
            >
              ✕
            </button>

            <button
              className={styles.viewerPrev}
              onClick={prevItem}
              aria-label="Anterior"
            >
              ‹
            </button>

            <button
              className={styles.viewerNext}
              onClick={nextItem}
              aria-label="Próximo"
            >
              ›
            </button>

            <div className={styles.viewerHitLeft} onClick={prevItem} />
            <div className={styles.viewerHitRight} onClick={nextItem} />

            {/* MEDIA */}
            {isImage(allItems[viewerIndex].type) ? (
              <img
                src={`/api/media?p=${encodeURIComponent(
                  allItems[viewerIndex].path
                )}`}
                alt={allItems[viewerIndex].name}
              />
            ) : (
              <video
                src={`/api/media?p=${encodeURIComponent(
                  allItems[viewerIndex].path
                )}`}
                controls
                autoPlay
                playsInline
                ref={viewerVideoRef}
              />
            )}
          </div>
        </div>
      )}
    </main>
  )
}
