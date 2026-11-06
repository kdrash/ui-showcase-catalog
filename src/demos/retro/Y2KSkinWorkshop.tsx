import { useState } from 'react'
import { Disc3, Pause, Play, Volume2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import nightLoop from './assets/night-loop.wav?url'
import bubbleLoop from './assets/bubble-loop.wav?url'
import { useLocalTrack } from './useLocalTrack'

const skins = [
  { id: 'chrome', surface: 'linear-gradient(169deg,#f4fbff 0%,#97a8be 23%,#35475f 49%,#bfcfe0 52%,#576b8a 78%,#d6e1ef 100%)', panel: '#111a2c', glow: '#b6f7e6', ink: '#0d233e', button: 'linear-gradient(#fff,#a3b5cb 47%,#627897 51%,#d2deea)', backdrop: '#172339' },
  { id: 'smoke', surface: 'linear-gradient(157deg,#aabcc5a8,#293240eb 38%,#697782cf 56%,#25323b 88%)', panel: '#161c1d', glow: '#ceef8f', ink: '#e5f2e3', button: 'linear-gradient(#818e95,#384954 48%,#283439 50%,#576e75)', backdrop: '#263539' },
  { id: 'gel', surface: 'linear-gradient(165deg,#ffe2f7,#fb8dc3 26%,#b93178 49%,#fa88bf 54%,#c83986 82%,#f891c4)', panel: '#3b1238', glow: '#ffd1f2', ink: '#461330', button: 'linear-gradient(#fff1fb,#ff9bd5 44%,#c4438e 51%,#ffaddb)', backdrop: '#501936' },
] as const
const tracks = [
  { name: 'Night Loop', source: nightLoop, bpm: 112, duration: 24 * 60 / 112 },
  { name: 'Bubble Loop', source: bubbleLoop, bpm: 128, duration: 24 * 60 / 128 },
]

function clock(seconds: number) {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function Y2KSkinWorkshop() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'skinLab' })
  const reducedMotion = useReducedMotion()
  const [skinIndex, setSkinIndex] = useState(0)
  const [trackIndex, setTrackIndex] = useState(0)
  const [time, setTime] = useState(0)
  const [volume, setVolume] = useState(.65)
  const { audio, playing, failed, togglePlayback, events } = useLocalTrack()
  const skin = skins[skinIndex]
  const track = tracks[trackIndex]

  return (
    <div className="@container h-full w-full overflow-y-auto px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-white motion-safe:transition-colors"
      style={{ backgroundColor: skin.backdrop, backgroundImage: 'repeating-linear-gradient(145deg,transparent 0 7px,#c5def010 8px 9px),radial-gradient(ellipse at 45% 20%,#fff2,transparent 67%)' }}>
      <audio ref={audio} src={track.source} preload="metadata" {...events}
        onLoadedMetadata={(event) => { event.currentTarget.volume = volume }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} />
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[.16em]"><Disc3 size={14} /> STEREOKIT / SKIN LAB</span>
          <div role="group" aria-label={t('skins')} className="flex flex-wrap gap-1">
            {skins.map(({ id }, index) => (
              <button key={id} type="button" aria-pressed={skinIndex === index} onClick={() => setSkinIndex(index)}
                className="rounded-full border border-white/45 px-2.5 py-1 text-[10px] font-bold hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-[#18253c]">{t(id)}</button>
            ))}
          </div>
        </header>
        <section className="relative rounded-[1.7rem] border-2 border-white/65 p-3 shadow-[inset_0_2px_1px_#fff9,inset_0_-3px_4px_#0006,0_10px_30px_#080c18aa] @sm:p-4"
          style={{ background: skin.surface, color: skin.ink }}>
          <header className="mb-2 flex flex-wrap items-center justify-between gap-1 px-1 font-mono text-[9px] font-black tracking-[.18em]">
            <span>STEREOKIT™ / MD-07</span><span>SKIN 0{skinIndex + 1}</span>
          </header>
          <div className="relative overflow-hidden rounded-[1rem] border-2 border-black/75 p-3 shadow-[inset_0_3px_11px_#000c]" style={{ backgroundColor: skin.panel, color: skin.glow }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-35 [background:repeating-linear-gradient(0deg,transparent_0_3px,#0006_3px_4px)]" />
            <div className="relative flex flex-wrap items-end justify-between gap-2">
              <div><p className="font-mono text-[9px] tracking-[.22em]">TRACK 0{trackIndex + 1} / {track.bpm} BPM</p><h2 className="text-[clamp(1.15rem,5cqw,2.8rem)] leading-tight font-black tracking-tight">{track.name}</h2></div>
              <output className="font-mono text-sm tabular-nums" aria-label={t('position')}>{clock(time)} / {clock(track.duration)}</output>
            </div>
            <div aria-hidden="true" className="relative mt-2 flex h-7 items-end gap-1">
              {Array.from({ length: 21 }, (_, index) => (
                <motion.span key={index} className="flex-1 origin-bottom rounded-t-[1px] bg-current"
                  style={{ height: `${36 + (index * 23) % 60}%`, opacity: playing ? .86 : .35 }}
                  animate={{ scaleY: playing && !reducedMotion ? [.27, 1, .43] : .3 }}
                  transition={{ duration: .55 + (index % 5) * .15, repeat: playing && !reducedMotion ? Infinity : 0 }} />
              ))}
            </div>
            <input type="range" aria-label={t('position')} min={0} max={track.duration} step={.05} value={Math.min(time, track.duration)}
              className="relative mt-1 block w-full" style={{ accentColor: skin.glow }}
              onChange={(event) => {
                if (!audio.current || !Number.isFinite(audio.current.duration)) return
                const position = Math.min(event.currentTarget.valueAsNumber, audio.current.duration)
                audio.current.currentTime = position
                setTime(position)
              }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={togglePlayback} className="inline-flex min-w-20 items-center justify-center gap-1.5 rounded-full border border-white/70 px-3 py-2 text-xs font-black shadow-[0_3px_0_#141e3355] active:translate-y-0.5 active:shadow-none"
              style={{ background: skin.button }}>
              {playing ? <Pause size={13} /> : <Play size={13} />}{t(playing ? 'pause' : 'play')}
            </button>
            <div role="group" aria-label={t('tracks')} className="flex flex-wrap gap-1">
              {tracks.map(({ name }, index) => (
                <button key={name} type="button" aria-pressed={trackIndex === index}
                  onClick={() => { if (index !== trackIndex) { audio.current?.pause(); setTrackIndex(index); setTime(0) } }}
                  className="rounded-full border border-current/45 px-2 py-1 text-[10px] font-black aria-pressed:bg-white/30">{name}</button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-1.5">
              <Volume2 size={14} aria-hidden="true" />
              <input type="range" aria-label={t('volume')} min={0} max={1} step={.01} value={volume} className="w-17 accent-current"
                onChange={(event) => {
                  const value = event.currentTarget.valueAsNumber
                  setVolume(value)
                  if (audio.current) audio.current.volume = value
                }} />
            </label>
          </div>
          {failed && <p role="status" className="mt-2 text-xs font-bold">{t('audioError')}</p>}
        </section>
      </div>
    </div>
  )
}
