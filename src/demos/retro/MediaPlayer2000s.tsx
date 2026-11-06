import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 2000年代のスキン付きデスクトップ・メディアプレイヤー(オリジナルスキン)。
 * - メタリックな面取りスキン、LCD のスクロールするタイトル、7セグ風の時間表示
 * - スペクトラムアナライザは本物の Web Audio(AnalyserNode)。再生ボタンで OscillatorNode のチップチューンを生成
 * - 10バンド EQ(BiquadFilterNode)・プリアンプ・音量・プレイリスト(ダブルクリックで再生)
 */

interface Track {
  title: string
  bpm: number
  root: number
  scale: number[]
  mel: number[]
  bass: number[]
  wave: OscillatorType
  len: number
}
const TRACKS: Track[] = [
  { title: 'Neon Highway', bpm: 128, root: 57, scale: [0, 3, 5, 7, 10, 12, 15], mel: [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, -1], bass: [0, -1, 0, -1, 3, -1, 3, -1], wave: 'square', len: 42 },
  { title: 'Sakura Drive', bpm: 104, root: 62, scale: [0, 2, 4, 7, 9, 12, 14], mel: [4, -1, 3, 2, 0, -1, 2, 3, 4, 5, 4, -1, 2, 1, 0, -1], bass: [0, -1, -1, 0, 4, -1, 3, -1], wave: 'triangle', len: 38 },
  { title: 'Midnight Modem', bpm: 140, root: 52, scale: [0, 2, 3, 7, 8, 12, 14], mel: [0, 0, 3, 0, 4, 3, 2, 0, 5, 4, 3, 2, 3, 2, 1, -1], bass: [0, 0, -1, 0, 2, -1, 1, -1], wave: 'sawtooth', len: 36 },
  { title: 'Pixel Sunset', bpm: 96, root: 60, scale: [0, 2, 4, 5, 7, 9, 11], mel: [2, 4, 6, 4, 5, -1, 3, -1, 1, 3, 5, 3, 4, -1, 2, -1], bass: [0, -1, 4, -1, 5, -1, 3, -1], wave: 'square', len: 40 },
]
const BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]
const BAND_LBL = ['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K']
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12)

interface Engine {
  ctx: AudioContext
  pre: GainNode
  vol: GainNode
  eq: BiquadFilterNode[]
  an: AnalyserNode
  noise: AudioBuffer
}

export function MediaPlayer2000s() {
  const [track, setTrack] = useState(0)
  const [state, setState] = useState<'stop' | 'play' | 'pause'>('stop')
  const [elapsed, setElapsed] = useState(0)
  const [vol, setVol] = useState(0.6)
  const [eq, setEq] = useState<number[]>([4, 3, 1, 0, -1, 0, 2, 3, 4, 4])
  const [eqOn, setEqOn] = useState(true)
  const [shuffle, setShuffle] = useState(false)
  const [sel, setSel] = useState(0)
  const eng = useRef<Engine | null>(null)
  const sched = useRef<{ timer?: ReturnType<typeof setInterval>; next: number; step: number; start: number }>({ next: 0, step: 0, start: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaks = useRef<number[]>([])

  const ensure = () => {
    if (eng.current) return eng.current
    const ctx = new AudioContext()
    const pre = ctx.createGain()
    const vol = ctx.createGain()
    const an = ctx.createAnalyser()
    an.fftSize = 256
    an.smoothingTimeConstant = 0.75
    const eqNodes = BANDS.map((f, i) => {
      const b = ctx.createBiquadFilter()
      b.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking'
      b.frequency.value = f
      b.Q.value = 1.1
      return b
    })
    pre.connect(eqNodes[0])
    eqNodes.reduce((a, b) => (a.connect(b), b))
    eqNodes[eqNodes.length - 1].connect(vol)
    vol.connect(an)
    an.connect(ctx.destination)
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    eng.current = { ctx, pre, vol, eq: eqNodes, an, noise }
    return eng.current
  }

  // EQ / 音量をノードに反映
  useEffect(() => {
    const e = eng.current
    if (!e) return
    e.eq.forEach((b, i) => b.gain.setTargetAtTime(eqOn ? eq[i] : 0, e.ctx.currentTime, 0.02))
    e.vol.gain.setTargetAtTime(vol * 0.5, e.ctx.currentTime, 0.02)
  }, [eq, eqOn, vol, state])

  const note = (e: Engine, t: number, freq: number, dur: number, type: OscillatorType, gain: number) => {
    const o = e.ctx.createOscillator()
    const g = e.ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(e.pre)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
  const hat = (e: Engine, t: number, open: boolean) => {
    const s = e.ctx.createBufferSource()
    s.buffer = e.noise
    const f = e.ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7000
    const g = e.ctx.createGain()
    g.gain.setValueAtTime(open ? 0.12 : 0.07, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.15 : 0.05))
    s.connect(f).connect(g).connect(e.pre)
    s.start(t)
    s.stop(t + 0.2)
  }
  const kick = (e: Engine, t: number) => {
    const o = e.ctx.createOscillator()
    const g = e.ctx.createGain()
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    o.connect(g).connect(e.pre)
    o.start(t)
    o.stop(t + 0.22)
  }

  const stopSched = () => clearInterval(sched.current.timer)
  const startSched = useCallback((ti: number) => {
    const e = ensure()
    const tr = TRACKS[ti]
    const s = sched.current
    stopSched()
    s.step = 0
    s.next = e.ctx.currentTime + 0.05
    s.start = s.next
    const spb = 60 / tr.bpm / 2 // 8分音符
    s.timer = setInterval(() => {
      while (s.next < e.ctx.currentTime + 0.12) {
        const st = s.step % 16
        const m = tr.mel[st]
        if (m >= 0) note(e, s.next, mtof(tr.root + 12 + tr.scale[m % tr.scale.length]), spb * 0.9, tr.wave, 0.07)
        const b = tr.bass[st % 8]
        if (b >= 0) note(e, s.next, mtof(tr.root - 12 + tr.scale[b]), spb * 1.6, 'triangle', 0.22)
        if (st % 4 === 0) kick(e, s.next)
        hat(e, s.next, st % 4 === 2)
        s.next += spb
        s.step++
      }
    }, 25)
  }, [])

  const play = (ti = track) => {
    const e = ensure()
    if (state === 'pause' && ti === track) {
      e.ctx.resume()
      setState('play')
      return
    }
    e.ctx.resume()
    setTrack(ti)
    setSel(ti)
    setElapsed(0)
    startSched(ti)
    setState('play')
  }
  const pause = () => {
    if (state !== 'play') return
    eng.current?.ctx.suspend()
    setState('pause')
  }
  const stop = () => {
    stopSched()
    setState('stop')
    setElapsed(0)
  }
  const skip = (d: number) => {
    const n = shuffle ? Math.floor(Math.random() * TRACKS.length) : (track + d + TRACKS.length) % TRACKS.length
    if (state === 'play') play(n)
    else {
      setTrack(n)
      setSel(n)
      setElapsed(0)
    }
  }

  // 経過時間と自動で次の曲へ
  useEffect(() => {
    if (state !== 'play') return
    const t = setInterval(() => {
      const e = eng.current
      if (!e) return
      const el = e.ctx.currentTime - sched.current.start
      setElapsed(el)
      if (el > TRACKS[track].len) skip(1)
    }, 250)
    return () => clearInterval(t)
  })

  // スペクトラム描画
  useEffect(() => {
    let raf = 0
    const cv = canvasRef.current!
    const g = cv.getContext('2d')!
    const N = 19
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const w = cv.width
      const h = cv.height
      g.fillStyle = '#000'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#0b1d0b'
      for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1)
      const e = eng.current
      const data = new Uint8Array(64)
      if (e && state === 'play') e.an.getByteFrequencyData(data)
      const bw = w / N
      const grad = g.createLinearGradient(0, h, 0, 0)
      grad.addColorStop(0, '#16a34a')
      grad.addColorStop(0.6, '#eab308')
      grad.addColorStop(1, '#ef4444')
      for (let i = 0; i < N; i++) {
        const idx = Math.floor((i / N) ** 1.6 * 48) + 1
        const v = (data[idx] ?? 0) / 255
        const bh = Math.round(v * (h - 2))
        g.fillStyle = grad
        g.fillRect(i * bw + 1, h - bh, bw - 2, bh)
        peaks.current[i] = Math.max((peaks.current[i] ?? 0) - 0.6, bh)
        g.fillStyle = '#d4d4d8'
        g.fillRect(i * bw + 1, h - peaks.current[i] - 2, bw - 2, 1)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [state])

  // アンマウントで音を止める
  useEffect(
    () => () => {
      clearInterval(sched.current.timer)
      eng.current?.ctx.close()
    },
    [],
  )

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const title = `${track + 1}. ${TRACKS[track].title} (${mmss(TRACKS[track].len)})  ***  `

  const skin = 'bg-[linear-gradient(#5b6170,#3a3f4b_45%,#2a2e37)] shadow-[inset_1px_1px_0_rgba(255,255,255,.35),inset_-1px_-1px_0_rgba(0,0,0,.6),0_6px_18px_rgba(0,0,0,.6)] border border-black rounded-[3px]'
  const bar = 'h-[13px] bg-[linear-gradient(90deg,#1e3a8a,#3b82f6_50%,#1e3a8a)] text-[9px] tracking-[.2em] text-[#cfe3ff] flex items-center justify-between px-1.5'
  const tbtn = 'h-[20px] w-[26px] rounded-[2px] border border-black bg-[linear-gradient(#e5e7eb,#9ca3af)] text-[10px] text-black shadow-[inset_1px_1px_0_#fff] active:bg-[linear-gradient(#9ca3af,#e5e7eb)]'

  return (
    <div className="relative flex h-full w-full items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#334155,#0f172a_60%,#020617)] p-3 font-[Inter] select-none">
      <div className="flex w-[300px] shrink-0 flex-col gap-2">
        {/* メイン */}
        <div className={skin}>
          <div className={bar}>
            <span>◆ SONICAMP</span>
            <span>_ ▫ ×</span>
          </div>
          <div className="flex gap-2 p-2">
            <div className="w-[118px] rounded-[2px] border border-black bg-black p-1 shadow-[inset_0_0_6px_#000]">
              <div className="flex items-center justify-between font-[VT323] text-[#4ade80]">
                <span className="text-[10px]">{state === 'play' ? '▶' : state === 'pause' ? '❚❚' : '■'}</span>
                <span className="text-[28px] leading-[26px] [text-shadow:0_0_6px_#22c55e]" style={{ opacity: state === 'pause' && Math.floor(Date.now() / 500) % 2 ? 0.3 : 1 }}>
                  {mmss(elapsed)}
                </span>
              </div>
              <canvas ref={canvasRef} width={108} height={30} className="mt-1 block h-[30px] w-[108px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-[2px] border border-black bg-black px-1 font-[VT323] text-[15px] leading-[18px] whitespace-nowrap text-[#4ade80]">
                <div className="mp-scroll inline-block">{title + title}</div>
              </div>
              <div className="mt-1 flex gap-1 font-[VT323] text-[12px] text-[#4ade80]">
                <span className="rounded-[2px] bg-black px-1">128 kbps</span>
                <span className="rounded-[2px] bg-black px-1">44 kHz</span>
                <span className={`ml-auto ${state === 'play' ? 'text-[#4ade80]' : 'text-zinc-600'}`}>STEREO</span>
              </div>
              <label className="mt-1.5 flex items-center gap-1 text-[8px] tracking-wider text-zinc-300">
                VOL
                <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(+e.target.value)} className="mp-range h-2 flex-1" />
              </label>
            </div>
          </div>
          <div className="px-2">
            <div className="relative h-[8px] rounded-full border border-black bg-[#111]">
              <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(#93c5fd,#2563eb)]" style={{ width: `${Math.min(100, (elapsed / TRACKS[track].len) * 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1 p-2">
            <button className={tbtn} onClick={() => skip(-1)} aria-label="prev">
              ⏮
            </button>
            <button className={tbtn} onClick={() => play()} aria-label="play">
              ▶
            </button>
            <button className={tbtn} onClick={pause} aria-label="pause">
              ❚❚
            </button>
            <button className={tbtn} onClick={stop} aria-label="stop">
              ■
            </button>
            <button className={tbtn} onClick={() => skip(1)} aria-label="next">
              ⏭
            </button>
            <button
              onClick={() => setShuffle((s) => !s)}
              className={`ml-auto rounded-[2px] border border-black px-1.5 text-[8px] tracking-wider ${shuffle ? 'bg-[#4ade80] text-black' : 'bg-[#1f2937] text-zinc-300'}`}
            >
              SHUFFLE
            </button>
          </div>
        </div>
        {/* EQ */}
        <div className={skin}>
          <div className={bar}>
            <span>◆ EQUALIZER</span>
            <span>×</span>
          </div>
          <div className="flex items-end gap-1 px-2 pt-1.5 pb-2">
            <div className="flex flex-col gap-1">
              <button onClick={() => setEqOn((v) => !v)} className={`rounded-[2px] border border-black px-1 text-[8px] ${eqOn ? 'bg-[#4ade80] text-black' : 'bg-[#1f2937] text-zinc-400'}`}>
                ON
              </button>
              <button onClick={() => setEq(BANDS.map(() => 0))} className="rounded-[2px] border border-black bg-[#1f2937] px-1 text-[8px] text-zinc-300">
                FLAT
              </button>
            </div>
            {eq.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  value={v}
                  onChange={(e) => setEq((q) => q.map((x, j) => (j === i ? +e.target.value : x)))}
                  className="mp-range mp-v"
                  aria-label={`EQ ${BAND_LBL[i]}`}
                />
                <span className="mt-0.5 text-[7px] text-zinc-400">{BAND_LBL[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* プレイリスト */}
      <div className={`${skin} flex h-[min(100%,330px)] min-w-0 flex-1 flex-col`} style={{ maxWidth: 260 }}>
        <div className={bar}>
          <span>◆ PLAYLIST</span>
          <span>×</span>
        </div>
        <div className="m-1.5 flex-1 overflow-auto bg-black p-1 font-[VT323] text-[15px] leading-[17px]">
          {TRACKS.map((t, i) => (
            <div
              key={t.title}
              onClick={() => setSel(i)}
              onDoubleClick={() => play(i)}
              className={`flex cursor-default justify-between px-1 ${sel === i ? 'bg-[#1e3a8a]' : ''} ${track === i ? 'text-white' : 'text-[#4ade80]'}`}
            >
              <span className="truncate">
                {i + 1}. {t.title}
              </span>
              <span>{mmss(t.len)}</span>
            </div>
          ))}
          <div className="mt-2 px-1 text-[12px] text-zinc-500">ダブルクリックで再生</div>
        </div>
        <div className="flex justify-between px-2 pb-1.5 font-[VT323] text-[13px] text-[#4ade80]">
          <span>4 tracks</span>
          <span>{mmss(TRACKS.reduce((a, t) => a + t.len, 0))}</span>
        </div>
      </div>
      <style>{`
        .mp-scroll { animation: mpScroll 9s linear infinite; }
        @keyframes mpScroll { to { transform: translateX(-50%); } }
        .mp-range { -webkit-appearance: none; appearance: none; background: #0b0b0d; border: 1px solid #000; border-radius: 2px; height: 6px; }
        .mp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border: 1px solid #000; border-radius: 2px; background: linear-gradient(#f4f4f5,#a1a1aa); }
        .mp-v { writing-mode: vertical-lr; direction: rtl; width: 6px; height: 54px; }
      `}</style>
    </div>
  )
}
