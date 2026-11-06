import { useState, type ComponentType } from 'react'
import {
  Dithering,
  ditheringPresets,
  GodRays,
  godRaysPresets,
  GrainGradient,
  grainGradientPresets,
  LiquidMetal,
  liquidMetalPresets,
  MeshGradient,
  meshGradientPresets,
  Metaballs,
  metaballsPresets,
  Swirl,
  swirlPresets,
  Warp,
  warpPresets,
} from '@paper-design/shaders-react'

type Preset = { name: string; params: Record<string, unknown> }
type Entry = { name: string; C: ComponentType<Record<string, unknown>>; presets: Preset[] }

const SHADERS: Entry[] = [
  { name: 'MeshGradient', C: MeshGradient as unknown as Entry['C'], presets: meshGradientPresets as unknown as Preset[] },
  { name: 'GrainGradient', C: GrainGradient as unknown as Entry['C'], presets: grainGradientPresets as unknown as Preset[] },
  { name: 'Warp', C: Warp as unknown as Entry['C'], presets: warpPresets as unknown as Preset[] },
  { name: 'Dithering', C: Dithering as unknown as Entry['C'], presets: ditheringPresets as unknown as Preset[] },
  { name: 'Metaballs', C: Metaballs as unknown as Entry['C'], presets: metaballsPresets as unknown as Preset[] },
  { name: 'LiquidMetal', C: LiquidMetal as unknown as Entry['C'], presets: liquidMetalPresets as unknown as Preset[] },
  { name: 'Swirl', C: Swirl as unknown as Entry['C'], presets: swirlPresets as unknown as Preset[] },
  { name: 'GodRays', C: GodRays as unknown as Entry['C'], presets: godRaysPresets as unknown as Preset[] },
]

/** Paper Shaders(@paper-design/shaders-react)のシェーダー背景をプリセットごとに切り替えて試せるギャラリー */
export function PaperShadersGallery() {
  const [si, setSi] = useState(0)
  const [pi, setPi] = useState(0)
  const [speed, setSpeed] = useState(1)
  const entry = SHADERS[si]
  const preset = entry.presets[pi] ?? entry.presets[0]
  const baseSpeed = typeof preset.params.speed === 'number' ? preset.params.speed : 1
  const C = entry.C

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950">
      <C key={`${si}-${pi}`} {...preset.params} speed={baseSpeed * speed} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {/* シェーダー選択 */}
      <div className="thin-scroll absolute top-2.5 right-2.5 left-2.5 flex gap-1 overflow-x-auto rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-md">
        {SHADERS.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              setSi(i)
              setPi(0)
            }}
            className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
              si === i ? 'bg-white text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      {/* プリセット + 速度 + コード */}
      <div className="absolute right-2.5 bottom-2.5 left-2.5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/50 p-2 text-white backdrop-blur-md">
        <div className="flex flex-wrap gap-1">
          {entry.presets.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPi(i)}
              className={`rounded-md px-2 py-0.5 text-[11px] transition ${pi === i ? 'bg-white/90 text-black' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[11px] text-white/70">
          speed
          <input type="range" min={0} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-20 accent-white" />
        </label>
        <code className="w-full truncate font-mono text-[10px] text-emerald-300/90">
          {`<${entry.name} {...${entry.name[0].toLowerCase() + entry.name.slice(1)}Presets[${pi}].params} speed={${(baseSpeed * speed).toFixed(2)}} />`}
        </code>
      </div>
    </div>
  )
}
