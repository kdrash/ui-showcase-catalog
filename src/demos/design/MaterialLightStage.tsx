import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Vector2 } from 'three'
import type { MeshPhysicalMaterialParameters } from 'three'
import { useTranslation } from 'react-i18next'

const finishes = [
  {
    id: 'ceramic', name: 'GLAZED CERAMIC', color: '#8bb8ac',
    material: { color: '#7ba79a', roughness: .2, clearcoat: 1, clearcoatRoughness: .1 },
  },
  {
    id: 'velvet', name: 'CUT VELVET', color: '#ba87a2',
    material: { color: '#6f284a', roughness: .78, sheen: 1, sheenRoughness: .4, sheenColor: '#eabdce' },
  },
  {
    id: 'metal', name: 'BRUSHED METAL', color: '#d3c2ac',
    material: { color: '#bca487', metalness: .92, roughness: .32, anisotropy: .82 },
  },
] satisfies { id: string; name: string; color: string; material: MeshPhysicalMaterialParameters }[]

const profile = [
  [0, -1.01], [.49, -1.01], [.53, -.99], [.54, -.91], [.61, -.86], [.74, -.7], [.88, -.42],
  [.97, -.12], [.99, .13], [.94, .38], [.84, .58], [.7, .72], [.56, .79], [.43, .83],
  [.38, .88], [.39, .98], [.41, 1.04], [.4, 1.07], [.33, 1.07], [.31, 1.03], [.32, .91],
  [.34, .84], [.44, .76], [.6, .64], [.76, .45], [.86, .15], [.85, -.15], [.72, -.51], [.46, -.83], [0, -.84],
].map(([x, y]) => new Vector2(x, y))

export function MaterialLightStage() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'light' })
  const [finishIndex, setFinishIndex] = useState(0)
  const [angle, setAngle] = useState(-37)
  const finish = finishes[finishIndex]
  const radians = angle * Math.PI / 180

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden bg-[#242925] text-[#f2e9d8]">
      <header className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/15 px-[5%] py-3">
        <span className="font-mono text-[9px] tracking-[.17em]">OBJECT LAB / 光の標本</span>
        <div role="group" aria-label={t('group')} className="flex gap-1">
          {finishes.map(({ id, color }, index) => (
            <button key={id} type="button" aria-pressed={finishIndex === index} onClick={() => setFinishIndex(index)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-2.5 py-1 text-[10px] aria-pressed:bg-white/15">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />{t(`${id}.label`)}
            </button>
          ))}
        </div>
      </header>
      <div className="relative isolate min-h-0 flex-1 bg-[#30372f]">
        <div className="absolute inset-0 -z-10 @lg:left-[24%]">
          <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1.32, 5.8], fov: 35 }}
            fallback={<div className="grid h-full place-items-center text-sm">{t('webgl')}</div>}>
            <ambientLight intensity={.58} />
            <pointLight position={[Math.sin(radians) * 3.8, 2.15, Math.cos(radians) * 3.8]} intensity={115} color="#ffe4ba" />
            <Environment frames={1} resolution={128}>
              <Lightformer position={[-3, 2, 2.7]} rotation={[0, -.65, 0]} scale={[2.4, 4, 1]} intensity={2.2} />
              <Lightformer position={[1.9, .9, -2.4]} rotation={[0, 2.2, 0]} scale={[2, 4, 1]} color="#9eb7cd" intensity={2} />
            </Environment>
            <group position={[0, -.02, 0]}>
              <mesh rotation={[0, .22, .08]}>
                <latheGeometry args={[profile, 100]} />
                <meshPhysicalMaterial key={finish.name} {...finish.material} />
              </mesh>
              <mesh position={[0, -1.19, 0]}>
                <cylinderGeometry args={[1.25, 1.32, .24, 80]} />
                <meshStandardMaterial color="#4c473c" roughness={.84} />
              </mesh>
            </group>
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-[#151a14]/95 to-transparent px-[5%] pt-9 pb-3 @lg:inset-y-0 @lg:right-auto @lg:flex @lg:max-w-[36%] @lg:flex-col @lg:justify-center @lg:bg-none @lg:py-0">
          <p className="font-mono text-[9px] tracking-[.18em]" style={{ color: finish.color }}>{finish.name}</p>
          <h2 className="font-serif text-[clamp(1.4rem,5.2cqw,4rem)] leading-tight tracking-tight">{t(`${finish.id}.heading`)}</h2>
          <p className="mt-1 max-w-45 text-[10px] leading-5 text-[#f2e9d8]/80 @lg:text-xs">{t(`${finish.id}.note`)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-white/15 px-[5%] pt-3 pb-[var(--solo-footer-clearance,0.75rem)]">
        <label className="flex min-w-0 flex-1 items-center gap-3 text-[10px] tracking-wider">
          <span className="shrink-0">{t('angle')}</span>
          <input type="range" min={-105} max={105} value={angle} onChange={(event) => setAngle(event.currentTarget.valueAsNumber)}
            className="min-w-0 flex-1 accent-[#ddc59d]" />
        </label>
        <output className="w-10 text-right font-mono text-xs tabular-nums">{angle}°</output>
      </div>
    </div>
  )
}
