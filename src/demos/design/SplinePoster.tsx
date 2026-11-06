import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Application } from '@splinetool/runtime'
import type { SPEObject } from '@splinetool/runtime'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

// The public scene linked from the official react-spline quick start.
const scene = 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode'
const inks = [
  { name: 'LIME', color: '#d4f36c', ink: '#162819' },
  { name: 'ICE', color: '#b0d8ff', ink: '#1c2f56' },
] as const

export function SplinePoster() {
  const { t } = useTranslation('demoControls')
  const canvas = useRef<HTMLCanvasElement>(null)
  const illustration = useRef<HTMLDivElement>(null)
  const angle = useRef({ pitch: 0, yaw: 0 })
  const sceneRef = useRef<{ app: Application; object: SPEObject; pitch: number; yaw: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [ink, setInk] = useState(0)
  const reduceMotion = useReducedMotion()
  const palette = inks[ink]

  const setTilt = useCallback((pitch: number, yaw: number) => {
    angle.current = { pitch, yaw }
    if (illustration.current) {
      illustration.current.style.transform = `perspective(760px) rotateX(${pitch}rad) rotateY(${yaw}rad)`
    }
    const live = sceneRef.current
    if (!live) return
    live.object.rotation.x = live.pitch + pitch
    live.object.rotation.y = live.yaw + yaw
    live.app.requestRender()
  }, [])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const controller = new AbortController()
    let app: Application | undefined
    let disposed = false
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    async function load(target: HTMLCanvasElement) {
      try {
        const instance = new Application(target, { renderMode: 'manual', htmlContentMode: 'none' })
        app = instance
        await instance.load(scene, undefined, { signal: controller.signal })
        if (disposed) return
        const object = instance.findObjectByName('Cube')
        if (!object) throw new Error('Spline poster cube missing')
        sceneRef.current = { app: instance, object, pitch: object.rotation.x, yaw: object.rotation.y }
        instance.setZoom(.85)
        setTilt(angle.current.pitch, angle.current.yaw)
        setStatus('ready')
      } catch {
        if (disposed) return
        app?.dispose()
        app = undefined
        sceneRef.current = null
        setStatus('fallback')
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void load(element)
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      controller.abort()
      sceneRef.current = null
      app?.dispose()
    }
  }, [setTilt])

  useEffect(() => {
    const live = sceneRef.current
    if (!live) return
    live.app.setBackgroundColor(palette.color)
    live.object.color = ink === 0 ? '#648b42' : '#547ec2'
    live.app.requestRender()
  }, [ink, palette.color, status])

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if ((reduceMotion || event.pointerType === 'touch') && !(event.buttons & 1)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setTilt((event.clientY - bounds.top) / bounds.height * .8 - .4, (event.clientX - bounds.left) / bounds.width * 1.15 - .575)
  }

  return (
    <div className="@container relative isolate flex h-full w-full touch-pan-y flex-col overflow-hidden px-[6%] pt-4 pb-[var(--solo-footer-clearance,1rem)] transition-colors motion-reduce:transition-none"
      style={{ backgroundColor: palette.color, color: palette.ink }}
      onPointerDown={tilt} onPointerMove={tilt} onPointerLeave={() => { if (!reduceMotion) setTilt(0, 0) }}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div ref={illustration} className={`absolute inset-0 ${status === 'ready' ? 'invisible' : ''}`}>
          <svg viewBox="0 0 600 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
            <g transform="translate(42 0)">
              <ellipse cx="345" cy="357" rx="162" ry="27" fill={palette.ink} opacity=".14" />
              <path d="m345 66 137 73-136 79-137-79Z" fill="white" opacity=".43" />
              <path d="m209 139 137 79v148l-137-85Z" fill={palette.ink} opacity=".28" />
              <path d="m346 218 136-79v142l-136 85Z" fill={palette.ink} opacity=".5" />
              <path d="m345 66 137 73-136 79-137-79Z M346 218v148" stroke={palette.ink} fill="none" opacity=".5" />
            </g>
          </svg>
        </div>
        <canvas ref={canvas} className={`relative h-full w-full ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
      </div>
      <header className="flex items-center justify-between gap-3 border-b border-current/50 pb-2 font-mono text-[9px] font-bold tracking-[.2em]">
        <span>OBJECT STUDIES / 001</span><span>SHAPE IN MOTION</span>
      </header>
      <div className="pointer-events-none flex flex-1 flex-col justify-center">
        <p className="font-mono text-[10px] font-bold tracking-[.25em]">A STUDY IN VOLUME</p>
        <h2 className="my-2 text-[clamp(3.2rem,14cqw,10rem)] leading-[.77] font-black tracking-[-.11em]">TILT<br />TYPE<span className="font-serif italic">.</span></h2>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-current/50 pt-2 font-mono text-[9px] font-bold tracking-widest">
        <div role="group" aria-label={t('poster.palette')} className="flex gap-1">
          {inks.map(({ name }, index) => (
            <button key={name} type="button" aria-pressed={ink === index} onClick={() => setInk(index)}
              className="rounded-full border border-current/55 px-2.5 py-1 aria-pressed:bg-black/15">{name}</button>
          ))}
        </div>
        <span role="status">
          {t(reduceMotion ? 'tilt.drag' : 'tilt.pointer')}
          {status !== 'ready' && ` · ${t(`tilt.${status}`)}`}
        </span>
        <a className="underline underline-offset-2" href="https://spline.design" target="_blank" rel="noreferrer">Made with Spline</a>
      </footer>
    </div>
  )
}
