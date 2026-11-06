import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/plugins/regions'
import { Pause, Play, Repeat, ZoomIn } from 'lucide-react'

const SR = 22050
const DUR = 12

/** OfflineAudioContext で短いメロディを“録音”し、WAV(Blob)とピーク配列を作る */
async function renderSong() {
  const ctx = new OfflineAudioContext(1, SR * DUR, SR)
  const out = ctx.createGain()
  out.gain.value = 0.5
  out.connect(ctx.destination)
  const beat = 60 / 96
  const note = (freq: number, t: number, len: number, type: OscillatorType, vol: number) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + len)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + len + 0.05)
  }
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  const melody = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74]
  const chords = [[48, 55, 64], [50, 57, 65], [45, 52, 60], [43, 50, 59]]
  for (let i = 0; i * beat < DUR - 0.5; i++) {
    const t = i * beat
    // キック
    const k = ctx.createOscillator()
    const kg = ctx.createGain()
    k.frequency.setValueAtTime(140, t)
    k.frequency.exponentialRampToValueAtTime(40, t + 0.15)
    kg.gain.setValueAtTime(i % 2 === 0 ? 0.9 : 0.45, t)
    kg.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    k.connect(kg).connect(out)
    k.start(t)
    k.stop(t + 0.32)
    note(hz(melody[i % 16]), t + (i % 4 === 3 ? beat / 2 : 0), beat * 0.9, 'triangle', 0.32)
    if (i % 4 === 0) chords[(i / 4) % 4].forEach((m) => note(hz(m), t, beat * 3.8, 'sine', 0.12))
  }
  const buf = await ctx.startRendering()
  const data = buf.getChannelData(0)
  // 16bit PCM WAV
  const bytes = new DataView(new ArrayBuffer(44 + data.length * 2))
  const str = (o: number, s: string) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  bytes.setUint32(4, 36 + data.length * 2, true)
  str(8, 'WAVEfmt ')
  bytes.setUint32(16, 16, true)
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, 1, true)
  bytes.setUint32(24, SR, true)
  bytes.setUint32(28, SR * 2, true)
  bytes.setUint16(32, 2, true)
  bytes.setUint16(34, 16, true)
  str(36, 'data')
  bytes.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true)
  // ピーク(デコード不要で波形を描けるよう事前計算)
  const N = 3000
  const peaks = new Float32Array(N)
  const block = Math.floor(data.length / N)
  for (let i = 0; i < N; i++) {
    let m = 0
    for (let j = 0; j < block; j++) m = Math.max(m, Math.abs(data[i * block + j]))
    peaks[i] = m
  }
  return { blob: new Blob([bytes.buffer], { type: 'audio/wav' }), peaks }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** wavesurfer.js v8 の波形プレイヤー(ローカル生成した音声・リージョン・ズーム・再生速度) */
export function WavesurferPlayer() {
  const hostRef = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [zoom, setZoom] = useState(0)
  const [rate, setRate] = useState(1)
  const [loopRegion, setLoopRegion] = useState(false)
  const loopRef = useRef(false)
  loopRef.current = loopRegion

  useEffect(() => {
    let cancelled = false
    let url = ''
    let inst: WaveSurfer | null = null
    renderSong().then(({ blob, peaks }) => {
      if (cancelled) return
      url = URL.createObjectURL(blob)
      const g = document.createElement('canvas').getContext('2d')!
      const wave = g.createLinearGradient(0, 0, 0, 120)
      wave.addColorStop(0, '#c4b5fd')
      wave.addColorStop(0.5, '#818cf8')
      wave.addColorStop(1, '#312e81')
      const prog = g.createLinearGradient(0, 0, 0, 120)
      prog.addColorStop(0, '#fbcfe8')
      prog.addColorStop(0.5, '#ec4899')
      prog.addColorStop(1, '#831843')
      const regions = RegionsPlugin.create()
      inst = WaveSurfer.create({
        container: hostRef.current!,
        height: 'auto',
        url,
        peaks: [peaks],
        duration: DUR,
        waveColor: wave,
        progressColor: prog,
        cursorColor: '#fff',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        normalize: true,
        dragToSeek: true,
        plugins: [regions],
      })
      ws.current = inst
      let chorusId = ''
      inst.on('ready', () => {
        regions.clearRegions()
        chorusId = regions.addRegion({ start: 2.5, end: 5, color: 'rgba(236,72,153,0.18)', content: 'Chorus', drag: true, resize: true }).id
        regions.addRegion({ start: 8, content: '★ Drop', color: '#fbbf24' })
      })
      regions.on('region-out', (r) => {
        if (loopRef.current && r.id === chorusId) r.play()
      })
      regions.on('region-clicked', (r, e) => {
        e.stopPropagation()
        r.play()
      })
      inst.on('play', () => setPlaying(true))
      inst.on('pause', () => setPlaying(false))
      inst.on('timeupdate', (t) => setTime(t))
    })
    return () => {
      cancelled = true
      inst?.destroy()
      ws.current = null
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => ws.current?.zoom(zoom), [zoom])
  useEffect(() => ws.current?.setPlaybackRate(rate, true), [rate])

  return (
    <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden bg-[linear-gradient(135deg,#1e1b4b,#0f0a1e_60%,#2a0a24)] p-4 text-white">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-indigo-500 text-xl shadow-lg shadow-pink-500/20">♪</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">Offline Melody #01</div>
          <div className="text-[11px] text-indigo-200/60">OfflineAudioContext で生成 ・ 96 BPM</div>
        </div>
        <div className="flex gap-1">
          {[0.75, 1, 1.5].map((r) => (
            <button key={r} type="button" onClick={() => setRate(r)} className={`rounded-md px-2 py-1 font-mono text-[11px] ${rate === r ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}>
              {r}×
            </button>
          ))}
        </div>
        <div className="font-mono text-xs text-indigo-100/80 tabular-nums">
          {fmt(time)} / {fmt(DUR)}
        </div>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1 rounded-xl bg-black/25 px-2 ring-1 ring-white/5" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => ws.current?.playPause()}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-indigo-950 shadow-lg transition hover:scale-105 active:scale-95"
        >
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => setLoopRegion((v) => !v)}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] transition ${loopRegion ? 'border-pink-400 bg-pink-500/20 text-pink-200' : 'border-white/15 text-white/60'}`}
        >
          <Repeat size={12} /> Chorus ループ
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-white/60">
          <ZoomIn size={12} />
          <input type="range" min={0} max={200} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="w-20 accent-pink-400" />
        </label>
      </div>
    </div>
  )
}
