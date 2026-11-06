import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, PresentationControls } from '@react-three/drei'
import * as THREE from 'three'
import { ShoppingBag } from 'lucide-react'

/**
 * 3D プロダクトコンフィギュレーター(タンブラー)
 * - 本体は LatheGeometry(断面の点列を回転)で手続き生成。フタ・バンドも同様にプリミティブで構成
 * - カラー / 仕上げ(マット・グロス・メタル)/ 容量を切り替えると色・質感・サイズ・価格が変化
 * - PresentationControls でドラッグ回転(離すとスナップ)、ContactShadows で接地影
 */

const COLORS = [
  { name: 'Sage', hex: '#8fae8b' },
  { name: 'Coral', hex: '#f0715f' },
  { name: 'Navy', hex: '#24345c' },
  { name: 'Sand', hex: '#d9c3a0' },
  { name: 'Lilac', hex: '#b9a3e3' },
  { name: 'Black', hex: '#1c1c1f' },
]
const FINISH = {
  matte: { roughness: 0.75, metalness: 0, clearcoat: 0, price: 0 },
  gloss: { roughness: 0.15, metalness: 0, clearcoat: 1, price: 400 },
  metal: { roughness: 0.22, metalness: 1, clearcoat: 0.3, price: 900 },
}
type Finish = keyof typeof FINISH
const SIZES = [
  { label: '350ml', scale: 0.86, price: 3200 },
  { label: '500ml', scale: 1, price: 3800 },
  { label: '750ml', scale: 1.16, price: 4500 },
]

function Tumbler({ color, finish, sy }: { color: string; finish: Finish; sy: number }) {
  const body = useMemo(() => {
    const pts: THREE.Vector2[] = []
    pts.push(new THREE.Vector2(0, 0))
    pts.push(new THREE.Vector2(0.72, 0))
    pts.push(new THREE.Vector2(0.78, 0.05))
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      pts.push(new THREE.Vector2(0.78 + 0.2 * Math.pow(t, 1.4), 0.05 + t * 2.45))
    }
    return new THREE.LatheGeometry(pts, 96)
  }, [])
  const mat = useRef<THREE.MeshPhysicalMaterial>(null)
  const group = useRef<THREE.Group>(null)
  const target = useMemo(() => new THREE.Color(color), [color])
  const f = FINISH[finish]
  useFrame(() => {
    if (mat.current) {
      mat.current.color.lerp(target, 0.12)
      mat.current.roughness = THREE.MathUtils.lerp(mat.current.roughness, f.roughness, 0.12)
      mat.current.metalness = THREE.MathUtils.lerp(mat.current.metalness, f.metalness, 0.12)
      mat.current.clearcoat = THREE.MathUtils.lerp(mat.current.clearcoat, f.clearcoat, 0.12)
    }
    if (group.current) group.current.scale.y = THREE.MathUtils.lerp(group.current.scale.y, sy, 0.12)
  })
  return (
    <group ref={group} position={[0, -1.35, 0]}>
      <mesh geometry={body} castShadow>
        <meshPhysicalMaterial ref={mat} color={color} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* 底のステンレスリング */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.805, 0.8, 0.28, 96, 1, true]} />
        <meshStandardMaterial color="#d4d4d8" metalness={1} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* フタ */}
      <group position={[0, 2.5, 0]}>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[1.0, 1.0, 0.26, 96]} />
          <meshStandardMaterial color="#e4e4e7" metalness={0.2} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.86, 0.96, 0.06, 96]} />
          <meshStandardMaterial color="#d4d4d8" roughness={0.4} />
        </mesh>
        <mesh position={[0.45, 0.31, 0]}>
          <boxGeometry args={[0.32, 0.05, 0.22]} />
          <meshStandardMaterial color="#27272a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

export function ProductConfigurator() {
  const { t, i18n } = useTranslation('demoControls', { keyPrefix: 'product' })
  const rootRef = useRef<HTMLDivElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [finish, setFinish] = useState<Finish>('matte')
  const [size, setSize] = useState(SIZES[1])
  const price = size.price + FINISH[finish].price

  return (
    <div ref={rootRef} className="@container relative flex h-full w-full overflow-hidden bg-gradient-to-br from-stone-100 to-stone-300 text-stone-900">
      <div className="relative min-w-0 flex-1">
        <Canvas dpr={[1, 1.5]} shadows="percentage" camera={{ position: [0, 0.6, 6], fov: 38 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow />
          <PresentationControls global={false} snap speed={1.4} polar={[-0.2, 0.3]} azimuth={[-Infinity, Infinity]} rotation={[0.1, -0.4, 0]}>
            <Tumbler color={color.hex} finish={finish} sy={size.scale} />
          </PresentationControls>
          <ContactShadows position={[0, -1.36, 0]} opacity={0.5} scale={6} blur={2.4} far={3} />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} />
            <Lightformer form="rect" intensity={2} position={[-4, 1, 2]} rotation-y={Math.PI / 3} scale={[2, 6, 1]} />
            <Lightformer form="rect" intensity={1.5} position={[4, 1, 2]} rotation-y={-Math.PI / 3} scale={[2, 6, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#ffe4c4" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
          </Environment>
        </Canvas>
        <div className="pointer-events-none absolute left-4 bottom-[var(--solo-footer-clearance,0.75rem)] text-[11px] text-stone-500">{t('rotate')}</div>
      </div>

      <aside className="flex w-[44%] max-w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-stone-900/10 bg-white/55 p-2 pb-[var(--solo-footer-clearance,0.5rem)] backdrop-blur-md @sm:p-4 @sm:pb-[var(--solo-footer-clearance,1rem)]">
        <div>
          <div className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Thermo Tumbler</div>
          <div className="text-lg leading-tight font-bold">{color.name} / {t(finish)}</div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] text-stone-500">{t('color')}</div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-white transition hover:scale-110 ${color.name === c.name ? 'ring-2 ring-stone-900' : 'ring-1 ring-stone-900/15'}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] text-stone-500">{t('finish')}</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-900/5 p-1">
            {(Object.keys(FINISH) as Finish[]).map((f) => (
              <button
                key={f}
                onClick={() => setFinish(f)}
                className={`rounded-md py-1 text-[11px] font-medium transition ${finish === f ? 'bg-white shadow' : 'text-stone-500 hover:text-stone-900'}`}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] text-stone-500">{t('capacity')}</div>
          <div className="flex gap-1">
            {SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setSize(s)}
                className={`flex-1 rounded-md border py-1 text-[11px] transition ${size.label === s.label ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-900/15 hover:border-stone-900/40'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-xl font-bold tabular-nums">¥{price.toLocaleString(i18n.resolvedLanguage)}</div>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700">
            <ShoppingBag size={13} /> {t('cart')}
          </button>
        </div>
      </aside>
    </div>
  )
}
