import { useEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'

type ToneNS = typeof import('tone')

const ROWS = [
  { name: 'KICK', color: '#f97316' },
  { name: 'SNARE', color: '#eab308' },
  { name: 'CLAP', color: '#ec4899' },
  { name: 'HAT', color: '#22d3ee' },
  { name: 'OPEN', color: '#a78bfa' },
]
const pat = (s: string) => s.split('').map((c) => c === 'x')
const PRESETS: Record<string, boolean[][]> = {
  'House': [pat('x...x...x...x...'), pat('................'), pat('....x.......x...'), pat('..x...x...x...x.'), pat('......x.......x.')],
  'Boom Bap': [pat('x.....x...x.....'), pat('....x.......x...'), pat('............x...'), pat('x.x.x.x.x.x.x.x.'), pat('...............x')],
  'Break': [pat('x.x.......x.....'), pat('....x..x.x..x..x'), pat('................'), pat('x.xxx.xxx.xxx.xx'), pat('......x.........')],
  'Trap': [pat('x......x..x.....'), pat('........x.......'), pat('........x.......'), pat('xxxxxxxxxxx.x.xx'), pat('................')],
}
const empty = () => ROWS.map(() => Array(16).fill(false) as boolean[])

/** Tone.js の 16ステップ・ドラムマシン(音はすべてシンセで合成) */
export function ToneStepSequencer() {
  const [grid, setGrid] = useState<boolean[][]>(() => PRESETS['House'].map((r) => [...r]))
  const gridRef = useRef(grid)
  gridRef.current = grid
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(118)
  const [swing, setSwing] = useState(0.15)
  const engine = useRef<{ Tone: ToneNS; dispose: () => void } | null>(null)
  const [preset, setPreset] = useState('House')

  const ensure = async () => {
    if (engine.current) return engine.current
    const Tone = await import('tone')
    await Tone.start()
    const out = new Tone.Volume(-6).toDestination()
    const comp = new Tone.Compressor(-18, 4).connect(out)
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0 } }).connect(comp)
    const snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.18, sustain: 0 }, volume: -8 }).connect(comp)
    const clapFilter = new Tone.Filter(1400, 'bandpass').connect(comp)
    const clap = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.16, sustain: 0 }, volume: -2 }).connect(clapFilter)
    const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5, volume: -24 }).connect(comp)
    const open = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.32, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4200, octaves: 1.5, volume: -26 }).connect(comp)
    const transport = Tone.getTransport()
    const seq = new Tone.Sequence(
      (time, s) => {
        const g = gridRef.current
        if (g[0][s]) kick.triggerAttackRelease('C1', '8n', time)
        if (g[1][s]) snare.triggerAttackRelease('16n', time)
        if (g[2][s]) {
          clap.triggerAttackRelease('32n', time)
          clap.triggerAttackRelease('16n', time + 0.012)
        }
        if (g[3][s]) hat.triggerAttackRelease(320, '32n', time, s % 4 === 0 ? 1 : 0.6)
        if (g[4][s]) open.triggerAttackRelease(320, '8n', time, 0.8)
        Tone.getDraw().schedule(() => setStep(s), time)
      },
      [...Array(16).keys()],
      '16n',
    ).start(0)
    engine.current = {
      Tone,
      dispose: () => {
        transport.stop()
        seq.dispose()
        ;[kick, snare, clap, clapFilter, hat, open, comp, out].forEach((n) => n.dispose())
      },
    }
    return engine.current
  }

  useEffect(() => () => engine.current?.dispose(), [])
  useEffect(() => {
    if (!engine.current) return
    const t = engine.current.Tone.getTransport()
    t.bpm.value = bpm
    t.swing = swing
    t.swingSubdivision = '16n'
  }, [bpm, swing, playing])

  const toggle = async () => {
    const e = await ensure()
    const t = e.Tone.getTransport()
    if (playing) {
      t.stop()
      setStep(-1)
      setPlaying(false)
    } else {
      t.bpm.value = bpm
      t.swing = swing
      t.swingSubdivision = '16n'
      t.start('+0.05')
      setPlaying(true)
    }
  }

  const flip = (r: number, c: number) => setGrid((g) => g.map((row, i) => (i === r ? row.map((v, j) => (j === c ? !v : v)) : row)))

  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-3 overflow-hidden bg-[linear-gradient(160deg,#27272a,#18181b_40%,#0c0a09)] p-4 font-[Space_Grotesk] text-zinc-200 select-none">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,.15),0_4px_10px_rgba(0,0,0,.5)] transition active:translate-y-px ${
            playing ? 'border-orange-400/60 bg-orange-500 text-black' : 'border-white/10 bg-zinc-700 text-white'
          }`}
          title={playing ? 'Stop' : 'Play'}
        >
          {playing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="leading-tight">
          <div className="text-[10px] tracking-[0.25em] text-zinc-500">TR-16 SYNTH DRUM</div>
          <div className="font-mono text-lg text-orange-300 tabular-nums">{bpm} BPM</div>
        </div>
        <label className="flex items-center gap-2 text-[10px] tracking-widest text-zinc-500">
          TEMPO
          <input type="range" min={70} max={170} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="w-20 accent-orange-400" />
        </label>
        <label className="flex items-center gap-2 text-[10px] tracking-widest text-zinc-500">
          SWING
          <input type="range" min={0} max={0.6} step={0.01} value={swing} onChange={(e) => setSwing(+e.target.value)} className="w-16 accent-orange-400" />
        </label>
        <div className="ml-auto flex gap-1">
          {[...Object.keys(PRESETS), 'Clear'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p)
                setGrid(p === 'Clear' ? empty() : PRESETS[p].map((r) => [...r]))
              }}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide transition ${preset === p ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-black/40 p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,.6)]">
        {ROWS.map((row, r) => (
          <div key={row.name} className="flex items-center gap-2">
            <div className="w-10 shrink-0 text-[10px] font-bold tracking-wider" style={{ color: row.color }}>
              {row.name}
            </div>
            <div className="grid flex-1 grid-cols-16 gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
              {grid[r].map((on, c) => {
                const head = c === step
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`${row.name} step ${c + 1}`}
                    onClick={() => flip(r, c)}
                    className={`aspect-square max-h-7 rounded-[5px] transition-[transform,background,box-shadow] duration-75 ${c % 4 === 0 ? 'ml-0' : ''} ${
                      head ? 'scale-110' : ''
                    }`}
                    style={{
                      background: on ? row.color : head ? '#3f3f46' : c % 8 < 4 ? '#27272a' : '#1f1f23',
                      boxShadow: on ? `0 0 ${head ? 18 : 10}px ${row.color}${head ? 'ee' : '88'}, inset 0 1px 0 rgba(255,255,255,.4)` : 'inset 0 1px 0 rgba(255,255,255,.05)',
                      opacity: on && !head && playing ? 0.85 : 1,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-10 shrink-0" />
          <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
            {Array.from({ length: 16 }, (_, c) => (
              <div key={c} className={`mx-auto h-1 w-1 rounded-full ${c === step ? 'bg-orange-400 shadow-[0_0_6px_#fb923c]' : c % 4 === 0 ? 'bg-zinc-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>
      {!playing && step === -1 && <div className="text-center text-[10px] text-zinc-500">▶ を押すと音が鳴ります(パッドをクリックで編集)</div>}
    </div>
  )
}
