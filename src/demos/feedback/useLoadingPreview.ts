import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'

export function useLoadingPreview(duration: number, { smooth = false } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { amount: .25, once: true })
  const [run, setRun] = useState({ id: 0, progress: 0, cancelled: false })
  const { id, progress, cancelled } = run
  const started = visible || id > 0
  const done = progress === 100
  const running = started && !cancelled && !done

  useEffect(() => {
    if (!running) return
    const start = performance.now()
    const update = () => {
      const elapsed = Math.min(100, (performance.now() - start) * 100 / duration)
      const next = smooth ? elapsed : Math.floor(elapsed)
      setRun((current) => current.id === id && !current.cancelled && next > current.progress
        ? { ...current, progress: next }
        : current)
      return next < 100
    }
    if (!smooth) {
      const interval = window.setInterval(update, 65)
      return () => window.clearInterval(interval)
    }
    const draw = () => {
      if (update()) frame = window.requestAnimationFrame(draw)
    }
    let frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [duration, id, running, smooth])

  return {
    ref, id, progress, cancelled, done, running,
    restart: () => setRun((current) => ({ id: current.id + 1, progress: 0, cancelled: false })),
    cancel: () => setRun((current) => current.progress === 100 ? current : { ...current, cancelled: true }),
  }
}
