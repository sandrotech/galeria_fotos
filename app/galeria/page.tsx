'use client'

import styles from './page.module.css'
import { useEffect, useState } from 'react'

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
                  {isImage(item.type) && <img src={src} alt={item.name} />}
                  {isVideo(item.type) && (
                    <video
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}
