'use client'

import styles from './page.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'

type Item = { name: string; path: string; type: string; size: number }
type Group = { date: string; items: Item[] }

function isImage(t: string) {
  return t === 'image'
}
function isVideo(t: string) {
  return t === 'video'
}

export default function Galeria() {
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/list', { cache: 'no-store' })
        if (!res.ok) throw new Error('Falha ao carregar lista')
        const data = await res.json()
        setGroups(data?.dates || [])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar galeria'
        setError(msg)
      }
    }
    run()
  }, [])

  const allItems = useMemo(() => {
    return groups.flatMap((g) => g.items)
  }, [groups])

  function openViewerByPath(path: string) {
    const i = allItems.findIndex((it) => it.path === path)
    if (i >= 0) setViewerIndex(i)
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

  useEffect(() => {
    if (viewerIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeViewer()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevItem()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextItem()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [viewerIndex])

  async function handleDelete(item: Item) {
    const ok = typeof window !== 'undefined' ? window.confirm('Excluir este arquivo?') : true
    if (!ok) return
    try {
      const res = await fetch(`/api/media?p=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Falha ao excluir arquivo')
      setGroups((gs) => {
        const next = gs
          .map((g) => ({
            ...g,
            items: g.items.filter((it) => it.path !== item.path),
          }))
          .filter((g) => g.items.length > 0)
        return next
      })
      setViewerIndex((vi) => {
        if (vi === null) return null
        const current = allItems[vi]
        if (!current) return null
        if (current.path === item.path) return null
        return vi
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir'
      if (typeof window !== 'undefined') window.alert(`❌ ${msg}`)
    }
  }

  function handlePlay(item: Item) {
    const v = videoRefs.current.get(item.path)
    if (v) {
      try {
        void v.play()
      } catch { }
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>💞 Galeria dos Noivos</h1>
        <p className={styles.subtitle}>As memórias enviadas pelos convidados</p>
      </div>

      {error && <p className={styles.empty}>❌ {error}</p>}

      {!error && groups.length === 0 && (
        <p className={styles.empty}>Ainda não há arquivos enviados.</p>
      )}

      {groups.map((g) => (
        <section key={g.date} className={styles.section}>
          <h2 className={styles.sectionTitle}>{g.date}</h2>
          <div className={styles.grid}>
            {g.items.map((item) => {
              const src = `/api/media?p=${encodeURIComponent(item.path)}`
              return (
                <div className={styles.item} key={item.path}>
                  {isImage(item.type) && (
                    <img
                      src={src}
                      alt={item.name}
                      onClick={() => openViewerByPath(item.path)}
                    />
                  )}
                  {isVideo(item.type) && (
                    <video
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      ref={(el) => {
                        if (el) videoRefs.current.set(item.path, el)
                        else videoRefs.current.delete(item.path)
                      }}
                    />
                  )}
                  <div className={styles.controls}>
                    <div className={styles.controlBar}>
                      <a
                        href={src}
                        download={item.name}
                        className={styles.controlButton}
                        aria-label="Baixar"
                        title="Baixar"
                      >
                        ⬇️
                      </a>
                      <button
                        onClick={() => handleDelete(item)}
                        className={styles.controlButton}
                        aria-label="Excluir"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                      {isVideo(item.type) && (
                        <button
                          onClick={() => handlePlay(item)}
                          className={styles.controlButton}
                          aria-label="Play"
                          title="Play"
                        >
                          ▶️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
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
            <button
              className={styles.viewerClose}
              onClick={closeViewer}
              aria-label="Fechar"
              title="Fechar"
            >
              ✕
            </button>
            <button
              className={styles.viewerPrev}
              onClick={prevItem}
              aria-label="Anterior"
              title="Anterior"
            >
              ‹
            </button>
            <button
              className={styles.viewerNext}
              onClick={nextItem}
              aria-label="Próximo"
              title="Próximo"
            >
              ›
            </button>
            <div className={styles.viewerHitLeft} onClick={prevItem} />
            <div className={styles.viewerHitRight} onClick={nextItem} />
            {(() => {
              const it = allItems[viewerIndex]
              const src = `/api/media?p=${encodeURIComponent(it.path)}`
              return isImage(it.type) ? (
                <img src={src} alt={it.name} />
              ) : (
                <video src={src} controls playsInline autoPlay />
              )
            })()}
          </div>
        </div>
      )}
    </main>
  )
}
