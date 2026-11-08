import { useSyncExternalStore } from 'react'

/**
 * お気に入りのデモ(ブラウザごとに localStorage へ保存)。
 * 保存できない環境でも、そのページを開いている間は覚えておく。
 */

const KEY = 'ui-showcase-favorites'
const listeners = new Set<() => void>()

function load(): ReadonlySet<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

let favorites = load()

function emit() {
  for (const l of listeners) l()
}

export function toggleFavorite(id: string) {
  const next = new Set(favorites)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  favorites = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // 保存できなくても表示には反映する
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // 別タブでの変更も反映する
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    favorites = load()
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => favorites)
}

/** 追加日(YYYY-MM-DD)から、この日数以内のデモを「NEW」とする */
export const NEW_DAYS = 30

export function isNewDemo(added: string | undefined, now = Date.now()) {
  if (!added) return false
  const time = Date.parse(`${added}T00:00:00`)
  return Number.isFinite(time) && now - time < NEW_DAYS * 86_400_000
}
