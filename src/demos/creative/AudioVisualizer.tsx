import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

type ToneNS = typeof import('tone')
type Mode = 'bars' | 'radial' | 'wave' | 'particles'
const MODES: { id: Mode; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'radial', label: 'Radial' },
  { id: 'wave', label: 'Wave' },
  { id: 'particles', label: 'Particles' },
]

/** Tone.js で生成したループ音楽を Web Audio の AnalyserNode で可視化 */
export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('radial')
  const modeRef = useRef(mode)
  modeRef.current = mode
  const [playing, setPlaying] = useState(false)
  const audio = useRef<{ Tone: ToneNS; analyser: AnalyserNode; clock: InstanceType<ToneNS['Clock']>; dispose: () => void } | null>(null)

  const toggle = async () => {
    if (!audio.current) {
      const Tone = await import('tone')
      await Tone.start()
      const ctx = Tone.getContext()
      const analyser = (ctx.rawContext as unknown as AudioContext).createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.82
      const master = new Tone.Volume(-8).toDestination()
      master.connect(analyser as unknown as AudioNode)
      const rev = new Tone.Reverb({ decay: 3, wet: 0.35 }).connect(master)
      const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 30 }, envelope: { attack: 0.6, decay: 0.5, sustain: 0.5, release: 2 }, volume: -20 }).connect(rev)
      const bass = new Tone.MonoSynth({ oscillator: { type: 'square' }, filter: { Q: 2, type: 'lowpass' }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, baseFrequency: 120, octaves: 3 }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3 }, volume: -10 }).connect(master)
      const arp = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.2 }, volume: -12 }).connect(rev)
      const kick = new Tone.MembraneSynth({ volume: -4 }).connect(master)
      const hat = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.04, sustain: 0 }, volume: -26 }).connect(master)
      const chords = [['A3', 'C4', 'E4', 'G4'], ['F3', 'A3', 'C4', 'E4'], ['C3', 'E3', 'G3', 'B3'], ['G3', 'B3', 'D4', 'F#4']]
      const roots = ['A1', 'F1', 'C2', 'G1']
      const arpNotes = [['A4', 'C5', 'E5', 'G5'], ['F4', 'A4', 'C5', 'E5'], ['C5', 'E5', 'G5', 'B5'], ['G4', 'B4', 'D5', 'F#5']]
      // 120BPM の 8分音符 = 4Hz。Transport を共有しないよう専用の Clock で回す
      const clock = new Tone.Clock((time, ticks) => {
        const t = Math.floor(ticks ?? 0) % 64
        const bar = Math.floor(t / 16) % 4
        if (t % 16 === 0) pad.triggerAttackRelease(chords[bar], 3.6, time)
        if (t % 4 === 0) kick.triggerAttackRelease('C1', '8n', time)
        if (t % 2 === 1) hat.triggerAttackRelease('32n', time)
        if (t % 2 === 0) bass.triggerAttackRelease(t % 4 === 2 ? Tone.Frequency(roots[bar]).transpose(12).toNote() : roots[bar], 0.2, time)
        arp.triggerAttackRelease(arpNotes[bar][(t * 3) % 4], 0.1, time + 0.125)
      }, 4)
      audio.current = {
        Tone,
        analyser,
        clock,
        dispose: () => {
          clock.stop()
          clock.dispose()
          ;[pad, bass, arp, kick, hat, rev, master].forEach((n) => n.dispose())
          analyser.disconnect()
        },
      }
    }
    const a = audio.current
    if (playing) {
      a.clock.stop()
      setPlaying(false)
    } else {
      a.clock.start('+0.05')
      setPlaying(true)
    }
  }
  useEffect(() => () => audio.current?.dispose(), [])

  useEffect(() => {
    const canvas = canvasRef.current!
    const g = canvas.getContext('2d')!
    let W = 0
    let H = 0
    const dpr = Math.min(2, window.devicePixelRatio)
    const ro = new ResizeObserver(() => {
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
    })
    ro.observe(canvas)
    const freq = new Uint8Array(512)
    const wave = new Uint8Array(1024)
    const parts: { x: number; y: number; vx: number; vy: number; life: number; h: number }[] = []
    let raf = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const t = now / 1000
      const an = audio.current?.analyser
      if (an && audio.current?.clock.state === 'started') {
        an.getByteFrequencyData(freq)
        an.getByteTimeDomainData(wave)
      } else {
        // 停止中は“呼吸する”ダミースペクトル
        for (let i = 0; i < freq.length; i++) freq[i] = Math.max(0, 70 + 50 * Math.sin(t * 1.3 + i * 0.09) * Math.cos(t * 0.7 + i * 0.023) - i * 0.25)
        for (let i = 0; i < wave.length; i++) wave[i] = 128 + 30 * Math.sin(i * 0.05 + t * 3) * Math.sin(t)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = 'rgba(7,5,18,0.28)'
      g.fillRect(0, 0, W, H)
      const bass = freq.slice(2, 10).reduce((a, b) => a + b, 0) / 8 / 255
      const m = modeRef.current
      g.globalCompositeOperation = 'lighter'
      if (m === 'bars') {
        const n = 64
        const bw = W / n
        for (let i = 0; i < n; i++) {
          const v = freq[Math.floor(Math.pow(i / n, 1.6) * 300) + 1] / 255
          const h = v * H * 0.42
          g.fillStyle = `hsl(${250 + i * 2.2} 90% ${45 + v * 25}%)`
          g.fillRect(i * bw + 1, H / 2 - h, bw - 2, h)
          g.globalAlpha = 0.35
          g.fillRect(i * bw + 1, H / 2 + 2, bw - 2, h * 0.6)
          g.globalAlpha = 1
        }
      } else if (m === 'radial') {
        const cx = W / 2
        const cy = H / 2
        const r = Math.min(W, H) * (0.18 + bass * 0.05)
        const n = 120
        for (let i = 0; i < n; i++) {
          const v = freq[Math.floor((i % (n / 2)) * 3) + 2] / 255
          const a = (i / n) * Math.PI * 2 + t * 0.2
          const len = v * Math.min(W, H) * 0.28
          g.strokeStyle = `hsl(${(i / n) * 360 + t * 40} 90% 62%)`
          g.lineWidth = 2.5
          g.beginPath()
          g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          g.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len))
          g.stroke()
        }
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r)
        grd.addColorStop(0, `rgba(244,114,182,${0.25 + bass * 0.5})`)
        grd.addColorStop(1, 'rgba(99,102,241,0)')
        g.fillStyle = grd
        g.beginPath()
        g.arc(cx, cy, r, 0, Math.PI * 2)
        g.fill()
      } else if (m === 'wave') {
        for (let k = 0; k < 3; k++) {
          g.strokeStyle = ['#22d3ee', '#a78bfa', '#f472b6'][k]
          g.lineWidth = 2
          g.shadowBlur = 14
          g.shadowColor = g.strokeStyle
          g.beginPath()
          for (let i = 0; i < wave.length; i += 2) {
            const x = (i / wave.length) * W
            const y = H / 2 + ((wave[i] - 128) / 128) * H * (0.38 - k * 0.08) + (k - 1) * 6
            if (i === 0) g.moveTo(x, y)
            else g.lineTo(x, y)
          }
          g.stroke()
        }
        g.shadowBlur = 0
      } else {
        const emit = 2 + Math.floor(bass * 14)
        for (let i = 0; i < emit; i++) {
          const a = Math.random() * Math.PI * 2
          const s = 1 + bass * 5 * Math.random()
          parts.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, h: 180 + Math.random() * 160 })
        }
        if (parts.length > 900) parts.splice(0, parts.length - 900)
        for (const p of parts) {
          p.x += p.vx
          p.y += p.vy
          p.life -= 0.008
          g.fillStyle = `hsla(${p.h} 90% 65% / ${Math.max(0, p.life)})`
          g.beginPath()
          g.arc(p.x, p.y, 1.6 + bass * 2, 0, Math.PI * 2)
          g.fill()
        }
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1)
      }
      g.globalCompositeOperation = 'source-over'
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070512]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute top-3 left-3 flex gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${mode === m.id ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggle}
        className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 active:scale-95"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? 'Pause' : 'Play loop'}
      </button>
      {!playing && <div className="absolute bottom-4 left-4 text-[10px] text-white/40">停止中はダミー波形 ・ Play で実際の音を解析</div>}
    </div>
  )
}
