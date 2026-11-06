import { useEffect, useId, useRef, useState } from 'react'
import { getProject, onChange } from '@theatre/core'
import type { __UNSTABLE_Project_OnDiskState, ISheet } from '@theatre/core'
import { Canvas, useThree } from '@react-three/fiber'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Group, PointLight } from 'three'

const duration = 5
const poses = [
  { time: 0, orbit: -.37, height: .8, distance: 7.5, sculpture: -.45, keyLight: 24, lightX: -3 },
  { time: 1.5, orbit: .28, height: 1.3, distance: 6.4, sculpture: .25, keyLight: 80, lightX: -.3 },
  { time: 3.2, orbit: .84, height: .55, distance: 5.2, sculpture: 1.25, keyLight: 100, lightX: 3 },
  { time: duration, orbit: .04, height: .35, distance: 6.9, sculpture: 1.83, keyLight: 51, lightX: 1 },
] as const
const channels = ['orbit', 'height', 'distance', 'sculpture', 'keyLight', 'lightX'] as const

const state = {
  definitionVersion: '0.4.0',
  revisionHistory: [],
  sheetsById: {
    Film: {
      staticOverrides: { byObject: {} },
      sequence: {
        type: 'PositionalSequence',
        length: duration,
        subUnitsPerUnit: 30,
        tracksByObject: {
          Direction: {
            trackIdByPropPath: Object.fromEntries(channels.map((channel) => [JSON.stringify([channel]), channel])),
            trackData: Object.fromEntries(channels.map((channel) => [channel, {
              type: 'BasicKeyframedTrack',
              keyframes: poses.map((pose) => ({
                id: `${channel}-${pose.time}`, position: pose.time, value: pose[channel],
                handles: [.48, 1, .52, 0], connectedRight: true, type: 'bezier',
              })),
            }])),
          },
        },
      },
    },
  },
} as __UNSTABLE_Project_OnDiskState

const project = getProject('Catalog Brand Film', { state })

function Sculpture({ sheet }: { sheet: ISheet }) {
  const object = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const { camera, invalidate } = useThree()

  useEffect(() => {
    const target = object.current
    const key = light.current
    if (!target || !key) return
    const direction = sheet.object('Direction', {
      orbit: poses[0].orbit, height: poses[0].height, distance: poses[0].distance,
      sculpture: poses[0].sculpture, keyLight: poses[0].keyLight, lightX: poses[0].lightX,
    })
    return direction.onValuesChange(({ orbit, height, distance, sculpture, keyLight, lightX }) => {
      camera.position.set(Math.sin(orbit) * distance, height, Math.cos(orbit) * distance)
      camera.lookAt(0, 0, 0)
      target.rotation.y = sculpture
      key.intensity = keyLight
      key.position.x = lightX
      invalidate()
    })
  }, [camera, invalidate, sheet])

  return (
    <>
      <color attach="background" args={['#21182f']} />
      <ambientLight intensity={1.2} color="#aa91c6" />
      <pointLight ref={light} position={[-3, 3, 3]} intensity={24} color="#ffe0af" />
      <pointLight position={[2, 0, -4]} intensity={55} color="#9d72ff" />
      <group ref={object} rotation={[.27, -.45, -.42]} scale={1.08}>
        <mesh>
          <torusKnotGeometry args={[1.04, .33, 144, 32, 2, 3]} />
          <meshPhysicalMaterial color="#a685dc" roughness={.25} metalness={.29} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[.34, 24, 20]} />
          <meshStandardMaterial color="#f7d097" emissive="#bb7344" emissiveIntensity={.6} />
        </mesh>
      </group>
    </>
  )
}

export function TheatreBrandFilm() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'theatre' })
  const instance = useId()
  const [sheet] = useState(() => project.sheet('Film', instance))
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const stopPosition = onChange(sheet.sequence.pointer.position, setPosition)
    const stopPlaying = onChange(sheet.sequence.pointer.playing, setPlaying)
    return () => {
      stopPosition()
      stopPlaying()
      sheet.sequence.pause()
      sheet.sequence.position = 0
    }
  }, [sheet])

  function togglePlayback() {
    if (playing) {
      sheet.sequence.pause()
      return
    }
    if (sheet.sequence.position >= duration) sheet.sequence.position = 0
    void sheet.sequence.play()
  }

  return (
    <div className="@container relative isolate flex h-full w-full flex-col overflow-hidden bg-[#21182f] p-4 pb-[var(--solo-footer-clearance,1rem)] text-[#f1e2ff] @md:p-6 @md:pb-[var(--solo-footer-clearance,1.5rem)]">
      <div className="absolute inset-0 -z-10 @lg:left-[30%]">
        <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [-2.7, .8, 7], fov: 42 }}
          fallback={<div className="grid h-full place-items-center text-xs">{t('webgl')}</div>}>
          <Sculpture sheet={sheet} />
        </Canvas>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-[#21182f] via-transparent to-transparent opacity-70" />
      <header className="flex justify-between border-b border-white/25 pb-2 font-mono text-[9px] tracking-[.18em]"><span>THEATRE.JS / STUDY 01</span><span>CAMERA · LIGHT · FORM</span></header>
      <div className="pointer-events-none flex flex-1 flex-col justify-center">
        <p className="font-mono text-[9px] tracking-[.2em] text-[#ecd2ab]">A SHORT FILM ABOUT LIGHT</p>
        <h2 className="mt-2 font-serif text-[clamp(2.4rem,8.5cqw,6.4rem)] leading-[.83] tracking-[-.075em]">Soft<br /><i>Gravity.</i></h2>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-white/20 bg-black/35 px-3 py-2 backdrop-blur-sm">
        <button type="button" aria-label={t(playing ? 'pause' : 'play')} onClick={togglePlayback} className="grid size-7 shrink-0 place-items-center rounded-full border border-white/35 hover:bg-white/15">
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <input type="range" min={0} max={duration} step={.01} value={position} aria-label={t('timeline')}
          onChange={(event) => {
            sheet.sequence.pause()
            sheet.sequence.position = event.currentTarget.valueAsNumber
          }}
          className="min-w-0 flex-1 accent-[#d4b4f5]" />
        <output className="shrink-0 font-mono text-[10px] tabular-nums">{position.toFixed(2)} / {duration.toFixed(2)}s</output>
        <button type="button" aria-label={t('reset')} onClick={() => { sheet.sequence.pause(); sheet.sequence.position = 0 }}
          className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-white/15"><RotateCcw size={13} /></button>
      </div>
    </div>
  )
}
