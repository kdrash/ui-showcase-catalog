import { useEffect, useRef, useState } from 'react'

type ToneNS = typeof import('tone')
type Engine = { Tone: ToneNS; synth: InstanceType<ToneNS['PolySynth']>; dispose: () => void }

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const KEYMAP = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';', "'"]
const NOTES = Array.from({ length: 25 }, (_, i) => {
  const name = NAMES[i % 12]
  return { note: `${name}${4 + Math.floor(i / 12)}`, name, black: name.includes('#'), key: KEYMAP[i] as string | undefined, i }
})
const SOLFEGE: Record<string, string> = { C: 'ド', D: 'レ', E: 'ミ', F: 'ファ', G: 'ソ', A: 'ラ', B: 'シ' }
const SOUNDS = {
  Soft: { oscillator: { type: 'fattriangle', count: 2, spread: 14 }, envelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 1.2 } },
  Lead: { oscillator: { type: 'fatsawtooth', count: 3, spread: 22 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.6 } },
  Bell: { oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.6 } },
} as const
type Sound = keyof typeof SOUNDS
const hue = (i: number) => (i * 29) % 360

/** Tone.js の PolySynth で弾ける 2オクターブのピアノ(マウス+PCキーボード) */
export function TonePiano() {
  const engine = useRef<Engine | null>(null)
  const loading = useRef<Promise<Engine> | null>(null)
  const [down, setDown] = useState<Set<string>>(new Set())
  const [last, setLast] = useState<string | null>(null)
  const [sustain, setSustain] = useState(false)
  const [sound, setSound] = useState<Sound>('Soft')
  const [bubbles, setBubbles] = useState<{ id: number; i: number }[]>([])
  const bid = useRef(0)
  const pointerDown = useRef(false)

  const ensure = () => {
    if (engine.current) return Promise.resolve(engine.current)
    loading.current ??= (async () => {
      const Tone = await import('tone')
      await Tone.start()
      const vol = new Tone.Volume(-10).toDestination()
      const reverb = new Tone.Reverb({ decay: 2.8, wet: 0.28 }).connect(vol)
      const synth = new Tone.PolySynth(Tone.Synth).connect(reverb)
      synth.set(SOUNDS[sound] as never)
      engine.current = { Tone, synth, dispose: () => [synth, reverb, vol].forEach((n) => n.dispose()) }
      return engine.current
    })()
    return loading.current
  }

  useEffect(() => () => engine.current?.dispose(), [])
  useEffect(() => {
    const e = engine.current
    if (!e) return
    e.synth.set(SOUNDS[sound] as never)
    if (sustain) e.synth.set({ envelope: { release: 4 } })
  }, [sound, sustain])

  const press = async (note: string, i: number) => {
    setDown((s) => new Set(s).add(note))
    setLast(note)
    const id = bid.current++
    setBubbles((b) => [...b.slice(-14), { id, i }])
    setTimeout(() => setBubbles((b) => b.filter((x) => x.id !== id)), 1400)
    const e = await ensure()
    e.synth.triggerAttack(note, e.Tone.now())
  }
  const release = (note: string) => {
    setDown((s) => {
      const n = new Set(s)
      n.delete(note)
      return n
    })
    engine.current?.synth.triggerRelease(note, engine.current.Tone.now())
  }

  const onKey = (e: React.KeyboardEvent, isDown: boolean) => {
    const n = NOTES.find((x) => x.key === e.key.toLowerCase())
    if (!n) return
    e.preventDefault()
    if (isDown) {
      if (!e.repeat) press(n.note, n.i)
    } else release(n.note)
  }

  const whites = NOTES.filter((n) => !n.black)
  const ww = 100 / whites.length
  const lastName = last ? last.replace(/\d/, '') : null

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      onPointerUp={() => (pointerDown.current = false)}
      onPointerLeave={() => (pointerDown.current = false)}
      className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#312e81,#0a0a14_65%)] outline-none select-none"
    >
      <style>{`@keyframes pianoBubble{0%{transform:translate(-50%,0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-150px) scale(1.1);opacity:0}}`}</style>
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="mr-auto">
          <div className="font-[Playfair_Display] text-3xl leading-none text-white italic tabular-nums">{last ?? '—'}</div>
          <div className="mt-1 text-[11px] text-indigo-200/60">{lastName ? `${SOLFEGE[lastName[0]] ?? ''}${lastName.includes('#') ? '♯' : ''} ・ ` : ''}クリック後 A〜' キーでも演奏</div>
        </div>
        {(Object.keys(SOUNDS) as Sound[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSound(s)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${sound === s ? 'bg-white text-indigo-950' : 'bg-white/10 text-indigo-100 hover:bg-white/20'}`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSustain((v) => !v)}
          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${sustain ? 'border-amber-300 bg-amber-300/20 text-amber-200' : 'border-white/15 text-indigo-100'}`}
        >
          Sustain {sustain ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="relative mx-4 flex-1">
        {bubbles.map((b) => {
          const n = NOTES[b.i]
          const wi = whites.findIndex((w) => w.i >= b.i)
          const x = n.black ? wi * ww : (wi + 0.5) * ww
          return (
            <span
              key={b.id}
              className="pointer-events-none absolute bottom-0 h-3 w-3 rounded-full"
              style={{ left: `${x}%`, background: `hsl(${hue(b.i)} 90% 65%)`, boxShadow: `0 0 16px hsl(${hue(b.i)} 90% 60%)`, animation: 'pianoBubble 1.4s ease-out forwards' }}
            />
          )
        })}
      </div>
      <div className="relative mx-3 mb-3 h-[52%] min-h-[120px] rounded-b-xl">
        {whites.map((n, idx) => {
          const on = down.has(n.note)
          return (
            <button
              key={n.note}
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.parentElement?.parentElement?.focus()
                pointerDown.current = true
                press(n.note, n.i)
              }}
              onPointerUp={() => release(n.note)}
              onPointerLeave={() => down.has(n.note) && release(n.note)}
              onPointerEnter={() => pointerDown.current && press(n.note, n.i)}
              className="absolute top-0 bottom-0 flex flex-col items-center justify-end rounded-b-lg border border-zinc-300 pb-2 text-[10px] text-zinc-400 transition-[background,transform] duration-75"
              style={{
                left: `${idx * ww}%`,
                width: `${ww}%`,
                background: on ? `linear-gradient(to bottom, #fff, hsl(${hue(n.i)} 90% 75%))` : 'linear-gradient(to bottom,#f4f4f5,#fff 70%,#e4e4e7)',
                boxShadow: on ? `0 0 24px hsl(${hue(n.i)} 90% 60% / .7)` : 'inset 0 -6px 0 #d4d4d8',
                transform: on ? 'translateY(2px)' : undefined,
              }}
            >
              {n.key && <span className="font-mono uppercase opacity-70">{n.key}</span>}
              {n.name === 'C' && <span className="font-semibold text-zinc-500">{n.note}</span>}
            </button>
          )
        })}
        {NOTES.filter((n) => n.black).map((n) => {
          const wi = whites.findIndex((w) => w.i > n.i)
          const on = down.has(n.note)
          return (
            <button
              key={n.note}
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.parentElement?.parentElement?.focus()
                pointerDown.current = true
                press(n.note, n.i)
              }}
              onPointerUp={() => release(n.note)}
              onPointerLeave={() => down.has(n.note) && release(n.note)}
              onPointerEnter={() => pointerDown.current && press(n.note, n.i)}
              className="absolute top-0 z-10 flex h-[60%] flex-col items-center justify-end rounded-b-md pb-1.5 text-[9px] text-zinc-400"
              style={{
                left: `${wi * ww - ww * 0.32}%`,
                width: `${ww * 0.64}%`,
                background: on ? `linear-gradient(to bottom,#18181b, hsl(${hue(n.i)} 80% 45%))` : 'linear-gradient(to bottom,#27272a,#09090b)',
                boxShadow: on ? `0 0 18px hsl(${hue(n.i)} 90% 55% / .8)` : 'inset 0 -4px 0 #3f3f46, 0 3px 6px rgba(0,0,0,.5)',
              }}
            >
              {n.key && <span className="font-mono uppercase">{n.key}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
