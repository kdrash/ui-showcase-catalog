import { useEffect, useRef, useState } from 'react'
import { Disc3, Image, Music2, Package, Pause, Play, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import nightLoop from './assets/night-loop.wav?url'
import { useLocalTrack } from './useLocalTrack'

const modules = [
  { key: 'wallpapers', icon: Image, code: '01' },
  { key: 'sampler', icon: Music2, code: '02' },
  { key: 'extras', icon: Package, code: '03' },
] as const
type Panel = typeof modules[number]['key']

const wallpapers = [
  { name: 'LUNAR', sky: '#323780', glow: '#a4edff', ground: '#141230' },
  { name: 'PULSE', sky: '#a22b62', glow: '#ffc485', ground: '#281330' },
  { name: 'MINT', sky: '#146e65', glow: '#beff9d', ground: '#172733' },
] as const
const bevel = 'border border-[#4a5366] bg-[#c9ced8] shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#697282] active:shadow-[inset_1px_1px_#697282,inset_-1px_-1px_#fff]'

export function BonusDiscLauncher() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'bonusDisc' })
  const [panel, setPanel] = useState<Panel | null>(null)
  const [wallpaperIndex, setWallpaperIndex] = useState(0)
  const [wireframe, setWireframe] = useState(false)
  const { audio, playing, failed, togglePlayback, events } = useLocalTrack()
  const launcherButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const wallpaper = wallpapers[wallpaperIndex]

  useEffect(() => {
    if (panel) closeButton.current?.focus({ preventScroll: true })
  }, [panel])

  function closePanel() {
    audio.current?.pause()
    setPanel(null)
    requestAnimationFrame(() => launcherButton.current?.focus({ preventScroll: true }))
  }

  return (
    <div className="@container relative isolate h-full w-full overflow-hidden bg-[#0d1024] text-[#eef4ff]"
      onKeyDown={(event) => {
        if (panel && event.key === 'Escape') {
          event.stopPropagation()
          closePanel()
        }
      }}>
      <audio ref={audio} src={nightLoop} preload="none" {...events} />
      <div inert={!!panel} className="h-full overflow-y-auto px-[5%] pt-3 pb-[var(--solo-footer-clearance,0.75rem)] [background:radial-gradient(ellipse_at_28%_42%,#344887,transparent_62%),linear-gradient(140deg,#151735,#0b0e1d_74%)]">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-between">
          <header className="flex flex-wrap items-center justify-between gap-1 border-b border-[#a9bffd]/35 pb-2 font-mono text-[10px] font-bold tracking-[.18em]">
            <span className="inline-flex items-center gap-2"><Disc3 size={14} /> DATAROOM PRESS</span><span className="text-[#b9cef9]">ISSUE 07 / BONUS DISC</span>
          </header>
          <div className="grid flex-1 items-center justify-center gap-4 py-4 @lg:grid-cols-[1fr_1.06fr]">
            <div aria-hidden="true" className="relative mx-auto grid aspect-square w-[clamp(7.25rem,37cqw,18rem)] max-w-full place-items-center rounded-full border-2 border-[#dae5f2] shadow-[0_0_55px_#76a9ff45,0_15px_35px_#050915] [background:repeating-radial-gradient(circle,transparent_0_3px,#202d463b_4px_5px),conic-gradient(from_23deg,#606f89,#e0f6ff,#9da1ff,#ffd2c2,#f5f2c6,#94e0eb,#365b89,#dce8ff,#636b90)]">
              <span className="absolute inset-[7%] rounded-full border border-white/75" />
              <span className="absolute inset-[16%] rounded-full border border-[#edf8ff]/75" />
              <span className="absolute top-[22%] left-[18%] -rotate-15 font-mono text-[clamp(.48rem,1.6cqw,1rem)] font-black tracking-widest text-[#10193a]">DATA / 07</span>
              <span className="grid size-[22%] place-items-center rounded-full border-2 border-[#e4e9fb] bg-[#7586a9]/75 shadow-inner">
                <span className="size-[45%] rounded-full border border-[#0b1534] bg-[#1b2549]" />
              </span>
            </div>
            <section className="mx-auto w-full max-w-100">
              <p className="mb-1 font-mono text-[9px] font-bold tracking-[.24em] text-[#a8c9ff]">INTERACTIVE MEDIA / 2001</p>
              <h2 className="mb-3 text-[clamp(1.7rem,6.4cqw,4.5rem)] leading-[.84] font-black tracking-[-.08em] italic">BONUS<br />DISC<span className="text-[#8eb7ff]">.07</span></h2>
              <div role="group" aria-label={t('menu')} className="grid gap-1.5">
                {modules.map(({ key, icon: Icon, code }) => (
                  <button key={key} type="button" onClick={(event) => { launcherButton.current = event.currentTarget; setPanel(key) }}
                    className="group flex items-center gap-2 rounded-full border border-[#ccd5e8] bg-linear-to-b from-[#eef5ff] via-[#9fb5d6] to-[#536994] px-3 py-1.5 text-left text-xs font-black text-[#0f1a38] shadow-[0_2px_0_#364b72] hover:from-white hover:via-[#c6e4ff] hover:shadow-[0_0_16px_#9cc9ff99] active:translate-y-px">
                    <Icon size={14} aria-hidden="true" /><span className="flex-1">{t(key)}</span><span className="font-mono text-[9px]">{code} / OPEN</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <footer className="flex flex-wrap justify-between gap-1 border-t border-[#a9bffd]/35 pt-2 font-mono text-[9px] tracking-[.15em] text-[#b9cef9]">
            <span>650 MB / CD-ROM</span><span>READY TO EXPLORE</span>
          </footer>
        </div>
      </div>
      {panel && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#03081c]/55 p-3"
          onClick={(event) => { if (event.target === event.currentTarget) closePanel() }}>
          <section role="dialog" aria-label={t(panel)} className="max-h-full w-full max-w-102 overflow-y-auto border border-[#f2f4ff] bg-[#c9ced8] p-1 text-[#172033] shadow-[3px_4px_0_#11192d,0_13px_35px_#050a26]">
            <header className="flex items-center justify-between gap-2 bg-linear-to-r from-[#151775] to-[#548ad2] py-1 pr-1 pl-2 text-xs font-bold text-white">
              <span>{t(panel)}.exe</span>
              <button ref={closeButton} type="button" aria-label={t('close')} onClick={closePanel} className={`grid size-6 place-items-center text-[#182035] ${bevel}`}><X size={14} /></button>
            </header>
            <div className="space-y-3 p-3">
              {panel === 'wallpapers' && (
                <>
                  <svg role="img" aria-label={t('wallpapers')} viewBox="0 0 360 120" className="w-full border border-[#4a5366]">
                    <rect width="360" height="120" fill={wallpaper.sky} />
                    <circle cx="245" cy="52" r="34" fill={wallpaper.glow} />
                    <path d="M0 105 75 62l40 24 62-49 67 58 43-18 73 27v16H0Z" fill={wallpaper.ground} />
                    <path d="M0 108h360M0 114h360" stroke={wallpaper.glow} opacity=".48" />
                    <text x="12" y="20" fontFamily="monospace" fontSize="11" fill={wallpaper.glow}>{wallpaper.name} / 800×600</text>
                  </svg>
                  <div className="flex flex-wrap gap-1.5">
                    {wallpapers.map(({ name }, index) => (
                      <button key={name} type="button" aria-pressed={wallpaperIndex === index} onClick={() => setWallpaperIndex(index)}
                        className={`px-2 py-1 font-mono text-[10px] aria-pressed:bg-[#a5b6dc] ${bevel}`}>{name}</button>
                    ))}
                  </div>
                </>
              )}
              {panel === 'sampler' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-mono text-[10px] tracking-widest">TRACK 01 / 112 BPM</p><p className="text-xl font-black">Night Loop</p></div>
                  <button type="button" onClick={togglePlayback} className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${bevel}`}>
                    {playing ? <Pause size={12} /> : <Play size={12} />}{t(playing ? 'pause' : 'play')}
                  </button>
                  {failed && <p role="status" className="text-xs text-red-900">{t('audioError')}</p>}
                </div>
              )}
              {panel === 'extras' && (
                <>
                  <div aria-hidden="true" className={`mx-auto my-2 grid size-21 rotate-12 place-items-center rounded-2xl border-2 border-[#363a87] ${wireframe ? 'bg-[#dae2ff] [background-image:repeating-linear-gradient(90deg,transparent_0_8px,#5964c6_8px_9px),repeating-linear-gradient(0deg,transparent_0_8px,#5964c6_8px_9px)]' : 'bg-linear-to-br from-[#d5f3ff] via-[#a1a4f4] to-[#5955a4] shadow-[inset_3px_3px_#e8f4ff,inset_-4px_-4px_#443c84]'}`}>
                    <span className="font-mono text-xs font-bold">OBJ 07</span>
                  </div>
                  <button type="button" aria-pressed={wireframe} onClick={() => setWireframe(!wireframe)} className={`px-3 py-1 text-xs font-bold aria-pressed:bg-[#a5b6dc] ${bevel}`}>{t('wireframe')}</button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
