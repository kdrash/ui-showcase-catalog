import { useEffect, useRef, useState } from 'react'

export function useLocalTrack() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = audio.current
    return () => element?.pause()
  }, [])

  function togglePlayback() {
    const element = audio.current
    if (!element) return
    if (!element.paused) {
      element.pause()
      return
    }
    setFailed(false)
    void element.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true)
    })
  }

  return {
    audio, playing, failed, togglePlayback,
    events: {
      onPlaying: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: () => setPlaying(false),
      onError: () => { setPlaying(false); setFailed(true) },
    },
  }
}
