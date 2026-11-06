import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'

type Mode = 'idle' | 'listening' | 'speaking'

const LABEL: Record<Mode, string> = { idle: '待機中', listening: '聞いています…', speaking: '話しています' }
const CAPTIONS = ['こんにちは！今日はどんなことを手伝いましょうか？', '明日の東京は晴れ、最高気温は18度の予報です。', 'リマインダーを午後3時に設定しました。']

/**
 * 音声アシスタント風のオーブ。Canvas 2D で 3 層のブロブを加算合成し、
 * 振幅(マイクの AnalyserNode もしくは疑似値)で輪郭を揺らす。
 */
export function VoiceOrb() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('idle')
  const [micState, setMicState] = useState<'off' | 'on' | 'denied'>('off')
  const [caption, setCaption] = useState('')
  const modeRef = useRef<Mode>('idle')
  const analyser = useRef<AnalyserNode | null>(null)
  const media = useRef<{ stream: MediaStream; ctx: AudioContext } | null>(null)
  const speakTimer = useRef<number | null>(null)
  modeRef.current = mode

  const stopMic = () => {
    media.current?.stream.getTracks().forEach((t) => t.stop())
    media.current?.ctx.close().catch(() => {})
    media.current = null
    analyser.current = null
  }

  useEffect(() => {
    const cv = canvas.current!
    const g = cv.getContext('2d')!
    let raf = 0
    let amp = 0
    let w = 0
    let h = 0
    const buf = new Uint8Array(128)
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(devicePixelRatio, 2)
      w = cv.clientWidth
      h = cv.clientHeight
      cv.width = w * dpr
      cv.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    })
    ro.observe(cv)
    const layers = [
      { c: [56, 189, 248], k: 3, s: 0.9, o: 0 },
      { c: [168, 85, 247], k: 4, s: -1.2, o: 2 },
      { c: [236, 72, 153], k: 5, s: 1.5, o: 4 },
    ]
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const t = now / 1000
      const m = modeRef.current
      // 目標振幅
      let target = 0.06 + Math.sin(t * 1.3) * 0.03
      if (m === 'listening') {
        if (analyser.current) {
          analyser.current.getByteFrequencyData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) sum += buf[i]
          target = Math.min(1, (sum / buf.length / 255) * 3.2)
        } else target = 0.25 + Math.abs(Math.sin(t * 7) * Math.sin(t * 2.3)) * 0.5
      } else if (m === 'speaking') target = 0.3 + Math.abs(Math.sin(t * 11) * Math.sin(t * 3.1 + 1)) * 0.6
      amp += (target - amp) * 0.12

      g.clearRect(0, 0, w, h)
      const cx = w / 2
      const cy = h / 2 - 18
      const R = Math.min(w, h) * 0.2 * (1 + amp * 0.18)
      // 背景グロー
      const glow = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.6)
      glow.addColorStop(0, `rgba(139,92,246,${0.25 + amp * 0.3})`)
      glow.addColorStop(1, 'rgba(139,92,246,0)')
      g.fillStyle = glow
      g.fillRect(0, 0, w, h)

      g.globalCompositeOperation = 'lighter'
      for (const L of layers) {
        g.beginPath()
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2
          const n = Math.sin(a * L.k + t * L.s * 2 + L.o) * 0.5 + Math.sin(a * (L.k + 2) - t * L.s * 1.3) * 0.5
          const r = R * (1 + n * (0.05 + amp * 0.22))
          const x = cx + Math.cos(a) * r
          const y = cy + Math.sin(a) * r
          if (i === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        const [r0, g0, b0] = L.c
        const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.25)
        grad.addColorStop(0, `rgba(${r0},${g0},${b0},0.9)`)
        grad.addColorStop(1, `rgba(${r0},${g0},${b0},0.05)`)
        g.fillStyle = grad
        g.fill()
      }
      g.globalCompositeOperation = 'source-over'
      // ハイライト
      const hl = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx - R * 0.35, cy - R * 0.4, R * 0.7)
      hl.addColorStop(0, 'rgba(255,255,255,0.55)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = hl
      g.beginPath()
      g.arc(cx, cy, R * 0.95, 0, Math.PI * 2)
      g.fill()
      // 周囲のイコライザ
      if (m !== 'idle') {
        g.strokeStyle = 'rgba(255,255,255,0.35)'
        g.lineWidth = 2
        g.lineCap = 'round'
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2
          const v = analyser.current && m === 'listening' ? buf[i % buf.length] / 255 : Math.abs(Math.sin(i * 1.7 + t * 6)) * amp
          const r1 = R * 1.45
          const r2 = r1 + 4 + v * R * 0.45
          g.beginPath()
          g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
          g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
          g.stroke()
        }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      stopMic()
      if (speakTimer.current) clearInterval(speakTimer.current)
    }
  }, [])

  const listen = async () => {
    if (speakTimer.current) clearInterval(speakTimer.current)
    if (mode === 'listening') {
      stopMic()
      setMicState((s) => (s === 'on' ? 'off' : s))
      setMode('idle')
      return
    }
    setCaption('')
    setMode('listening')
    if (micState === 'denied' || !navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const an = ctx.createAnalyser()
      an.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(an)
      media.current = { stream, ctx }
      analyser.current = an
      setMicState('on')
    } catch {
      setMicState('denied') // 拒否されたら疑似振幅で続行
    }
  }

  const speak = () => {
    stopMic()
    setMicState((s) => (s === 'on' ? 'off' : s))
    setMode('speaking')
    const text = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]
    let i = 0
    if (speakTimer.current) clearInterval(speakTimer.current)
    speakTimer.current = window.setInterval(() => {
      i++
      setCaption(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(speakTimer.current!)
        setTimeout(() => setMode((m) => (m === 'speaking' ? 'idle' : m)), 600)
      }
    }, 70)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1033_0%,#06060c_70%)] text-white">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-wide text-zinc-300 backdrop-blur">
        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${mode === 'idle' ? 'bg-zinc-500' : mode === 'listening' ? 'animate-pulse bg-cyan-400' : 'animate-pulse bg-fuchsia-400'}`} />
        {LABEL[mode]}
        {mode === 'listening' && micState === 'on' && ' · マイク入力'}
        {mode === 'listening' && micState !== 'on' && ' · 疑似入力'}
      </div>
      <div className="absolute inset-x-0 bottom-16 px-6 text-center text-sm text-zinc-200 [text-shadow:0_1px_8px_#000]">{caption}</div>
      {micState === 'denied' && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 text-[11px] text-amber-300/90">マイクが使えないため疑似波形で表示しています</div>
      )}
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={listen}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium backdrop-blur transition ${
            mode === 'listening' ? 'bg-cyan-400 text-zinc-900' : 'border border-white/15 bg-white/10 hover:bg-white/20'
          }`}
        >
          {mode === 'listening' ? <MicOff size={14} /> : <Mic size={14} />}
          {mode === 'listening' ? '終了' : '話しかける'}
        </button>
        <button
          type="button"
          onClick={speak}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur transition hover:bg-white/20"
        >
          <Volume2 size={14} /> 応答を再生
        </button>
      </div>
    </div>
  )
}
