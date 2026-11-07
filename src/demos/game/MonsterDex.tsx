import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { animate, motion, useReducedMotion } from 'motion/react'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { CaptureCapsule, MONSTERS, STAT_LABELS, TypeBadge, type MonsterData } from './monsters'
import { makeMonUniforms, Monster3D } from './monsters3d'

/**
 * 赤い筐体のモンスター図鑑端末(DOM + React Three Fiber の 3D ビューア)。
 * - 筐体・レンズ・ランプ・ヒンジ・スピーカー穴はすべて CSS のグラデーションと影で描いた立体表現
 * - 左の液晶は番号付きリスト、右の液晶は詳細。液晶感は淡い緑の地色+走査線の repeating-linear-gradient
 * - 詳細の 3D ビューアはプリミティブで組んだトゥーン調モデルをターンテーブルに載せ、OrbitControls で自動回転+ドラッグ
 *   背面からの寒色ライトとシェーダーに差し込んだリム項で輪郭を光らせる
 * - 発見済みを選ぶと、シェーダーの uniform(ワールド Y の走査線)を motion で下から上へ動かし、黒シルエットから色が戻る
 *   未発見は「？？？」とシルエットのまま、能力値は「---」
 * - 能力値バーはセグメント状のグラデーションで、選ぶたびに Motion で伸びる。説明文は1文字ずつ表示
 * - ↑↓ / PageUp・PageDown / Home・End、ホイール(passive: false のネイティブリスナーをリスト要素だけに登録)で移動
 * - 動きを減らす設定では走査線演出・自動回転・ランプの点滅を止める
 */

const UNSEEN = new Set([8, 11, 12])
const LCD = '#1f2a1c'

const KEYFRAMES = `
@keyframes dx-blink { 0%,55% { opacity: 1 } 56%,100% { opacity: .18 } }
@keyframes dx-glow { 0%,100% { box-shadow: 0 0 0 3px #f4f7ff, 0 0 0 5px #5b0c12, 0 0 10px 3px rgba(80,190,255,.45) } 50% { box-shadow: 0 0 0 3px #f4f7ff, 0 0 0 5px #5b0c12, 0 0 22px 8px rgba(80,190,255,.75) } }
@keyframes dx-caret { 50% { opacity: 0 } }
`

export function MonsterDex() {
  const reduced = !!useReducedMotion()
  const [index, setIndex] = useState(0)
  const [scan, setScan] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const indexRef = useRef(0)
  const total = MONSTERS.length
  const seen = total - UNSEEN.size

  const go = (next: number) => {
    const i = Math.max(0, Math.min(total - 1, next))
    indexRef.current = i
    setIndex(i)
  }

  // 選択行がリストの表示範囲に入るようにスクロール(ページ自体は動かさない)
  useEffect(() => {
    const list = listRef.current
    const row = rowRefs.current[index]
    if (!list || !row) return
    const top = row.offsetTop - list.offsetTop
    if (top < list.scrollTop + 4) list.scrollTop = Math.max(0, top - 4)
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight - 4) list.scrollTop = top + row.offsetHeight - list.clientHeight + 4
  }, [index])

  // ホイールでリストを1件ずつ移動(端まで行ったらページのスクロールに任せる)
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let acc = 0
    let last = 0
    const onWheel = (e: WheelEvent) => {
      const dir = Math.sign(e.deltaY)
      const cur = indexRef.current
      if (!dir || (dir < 0 && cur === 0) || (dir > 0 && cur === total - 1)) return
      e.preventDefault()
      const now = performance.now()
      if (now - last > 250) acc = 0
      last = now
      acc += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY
      if (Math.abs(acc) >= 45) {
        acc = 0
        const i = Math.max(0, Math.min(total - 1, indexRef.current + dir))
        indexRef.current = i
        setIndex(i)
      }
    }
    list.addEventListener('wheel', onWheel, { passive: false })
    return () => list.removeEventListener('wheel', onWheel)
  }, [total])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, PageUp: -5, PageDown: 5 }
    if (e.key in map) {
      e.preventDefault()
      go(indexRef.current + map[e.key])
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      go(e.key === 'Home' ? 0 : total - 1)
    } else if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      setScan((s) => s + 1)
    }
  }

  const mon = MONSTERS[index]
  const known = !UNSEEN.has(mon.no)

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="モンスター図鑑。上下キーかホイールでリストを移動、Enterで再スキャン"
      className="@container relative h-full w-full overflow-hidden bg-[radial-gradient(90%_70%_at_50%_30%,#3a3f4d,#16181f)] font-['Noto_Sans_JP',Inter,sans-serif] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#7fd0ff] focus-visible:ring-inset"
    >
      <style>{KEYFRAMES}</style>
      <div className="mx-auto flex h-full max-w-[1080px] items-center p-2 pb-[var(--solo-footer-clearance,0.5rem)] @min-[40rem]:p-3 @min-[40rem]:pb-[var(--solo-footer-clearance,0.75rem)]">
        <div className="flex h-full max-h-[720px] w-full gap-0 rounded-[22px] border-2 border-[#5b0c12] bg-[linear-gradient(160deg,#ec4a4c,#c4232d_55%,#a0141f)] p-1.5 shadow-[inset_0_2px_0_rgba(255,255,255,.35),inset_0_-4px_0_rgba(0,0,0,.25),0_18px_40px_rgba(0,0,0,.5)] @min-[40rem]:p-2">
          {/* ---- 左半分:リスト ---- */}
          <section aria-label="図鑑リスト" className="flex w-[42%] min-w-0 flex-col @min-[52rem]:w-[37%]">
            <div className="flex h-[46px] shrink-0 items-center gap-2.5 px-2 @min-[40rem]:h-[52px]">
              <motion.span
                key={index}
                aria-hidden
                initial={reduced ? false : { filter: 'brightness(2.2)' }}
                animate={{ filter: 'brightness(1)' }}
                transition={{ duration: 0.5 }}
                className="relative size-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d9f4ff_0%,#4fc3ff_30%,#1270c4_70%,#0a3f7a)] [box-shadow:0_0_0_3px_#f4f7ff,0_0_0_5px_#5b0c12,0_0_12px_4px_rgba(80,190,255,.5)] motion-safe:animate-[dx-glow_2.4s_ease-in-out_infinite] @min-[40rem]:size-10"
              >
                <span className="absolute top-[18%] left-[22%] size-[26%] rounded-full bg-white/80" />
              </motion.span>
              <Lamp color="#ff5a5a" speed="1.1s" />
              <Lamp color="#ffd34a" speed="0.7s" delay="0.2s" />
              <Lamp color="#5ee07a" speed="1.9s" delay="0.5s" />
              <span className="ml-auto hidden font-['Orbitron'] text-[9px] font-bold tracking-[0.2em] text-[#ffd9d4]/80 @min-[36rem]:inline">INDEX</span>
            </div>

            <Bezel className="min-h-0 flex-1">
              <div className="flex shrink-0 items-center justify-between border-b border-[#1f2a1c]/30 px-2 py-0.5 font-['VT323'] text-[14px] leading-tight text-[#1f2a1c]">
                <span>ずかん リスト</span>
                <span>
                  {String(seen).padStart(2, '0')}/{total}
                </span>
              </div>
              <div ref={listRef} role="listbox" aria-label="モンスター一覧" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5 [scrollbar-width:none]">
                {MONSTERS.map((m, i) => {
                  const sel = i === index
                  const ok = !UNSEEN.has(m.no)
                  return (
                    <button
                      key={m.no}
                      id={`dex-row-${i}`}
                      ref={(el) => {
                        rowRefs.current[i] = el
                      }}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(i)}
                      className={`flex h-[26px] w-full items-center gap-1.5 px-1.5 text-left text-[13px] font-bold @min-[40rem]:h-[28px] @min-[40rem]:text-[14px] ${
                        sel ? 'bg-[#1f2a1c] text-[#d8e4c4]' : 'text-[#1f2a1c] hover:bg-[#1f2a1c]/10'
                      }`}
                    >
                      <span aria-hidden className={`w-2.5 shrink-0 text-[9px] ${sel ? 'motion-safe:animate-[dx-caret_.9s_steps(1)_infinite]' : 'opacity-0'}`}>
                        ▶
                      </span>
                      <span className="shrink-0 font-['VT323'] text-[16px] leading-none">No.{String(m.no).padStart(3, '0')}</span>
                      {ok ? (
                        <CaptureCapsule className={`size-3.5 shrink-0 ${sel ? 'brightness-125' : ''}`} />
                      ) : (
                        <span aria-hidden className="w-3.5 shrink-0 text-center text-[10px] opacity-60">・</span>
                      )}
                      <span className="min-w-0 truncate">{ok ? m.name : '？？？'}</span>
                    </button>
                  )
                })}
              </div>
            </Bezel>

            <div className="flex h-[46px] shrink-0 items-center gap-2 px-1.5 @min-[40rem]:h-[52px]">
              <div className="flex flex-col gap-0.5">
                <PadButton label="ひとつ上へ" onClick={() => go(index - 1)} disabled={index === 0}>
                  ▲
                </PadButton>
                <PadButton label="ひとつ下へ" onClick={() => go(index + 1)} disabled={index === total - 1}>
                  ▼
                </PadButton>
              </div>
              <div className="min-w-0 rounded-[6px] border-2 border-[#3b0a10] bg-[#1d2a1f] px-2 py-0.5 font-['VT323'] leading-none text-[#7dff9a] shadow-[inset_0_2px_6px_rgba(0,0,0,.6)] [text-shadow:0_0_6px_rgba(125,255,154,.6)]">
                <span className="block text-[11px] opacity-70">はっけん</span>
                <span className="text-[20px]">{String(seen).padStart(3, '0')}</span>
              </div>
              <Grille className="ml-auto hidden @min-[30rem]:grid" />
            </div>
          </section>

          {/* ヒンジ */}
          <div aria-hidden className="mx-1 flex w-3 shrink-0 flex-col justify-center gap-1.5 @min-[40rem]:mx-1.5 @min-[40rem]:w-4">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[22%] rounded-full border border-[#5b0c12] bg-[linear-gradient(90deg,#7a0f18,#d8424a_45%,#ff8a8a_55%,#8e1520)] shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
            ))}
          </div>

          {/* ---- 右半分:詳細 ---- */}
          <section aria-label="詳細" className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-[46px] shrink-0 items-center gap-2 px-2 @min-[40rem]:h-[52px]">
              <span className="font-['Orbitron'] text-[10px] font-black tracking-[0.25em] text-[#ffe4df] [text-shadow:0_1px_0_#7a0f18] @min-[40rem]:text-[12px]">FIELD INDEX</span>
              <span className="ml-auto flex gap-1">
                {['#ffd34a', '#5ee07a', '#4fc3ff'].map((c, i) => (
                  <span key={c} aria-hidden className="h-1.5 w-5 rounded-full border border-[#5b0c12] motion-safe:animate-[dx-blink_1.6s_steps(1)_infinite]" style={{ background: c, animationDelay: `${i * 0.25}s` }} />
                ))}
              </span>
            </div>

            <Bezel className="min-h-0 flex-1" light>
              <Detail mon={mon} known={known} reduced={reduced} scan={scan} />
            </Bezel>

            <div className="flex h-[46px] shrink-0 items-center gap-2 px-1.5 @min-[40rem]:h-[52px]">
              <button
                type="button"
                onClick={() => setScan((s) => s + 1)}
                className="rounded-full border-2 border-[#3b0a10] bg-[linear-gradient(#3a3f4d,#1d2029)] px-3 py-1 text-[11px] font-black tracking-wider text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_0_#5b0c12] hover:brightness-125 active:translate-y-px"
              >
                スキャン
              </button>
              <span className="hidden min-w-0 truncate text-[10px] font-bold text-[#ffe4df]/80 @min-[44rem]:inline">↑↓・ホイールで選択 / Enter で再スキャン</span>
              <Grille className="ml-auto grid" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Lamp({ color, speed, delay = '0s' }: { color: string; speed: string; delay?: string }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full border border-[#5b0c12] motion-safe:animate-[dx-blink_var(--s)_steps(1)_infinite] @min-[40rem]:size-3"
      style={{ background: `radial-gradient(circle at 35% 30%, #fff 0 18%, ${color} 40%)`, boxShadow: `0 0 8px ${color}`, '--s': speed, animationDelay: delay } as CSSProperties}
    />
  )
}

function Bezel({ className = '', light = false, children }: { className?: string; light?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-[12px] border-2 border-[#3b0a10] bg-[linear-gradient(#3c3f48,#23252c)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_2px_0_rgba(255,255,255,.2)] @min-[40rem]:p-2 ${className}`}>
      <div
        className="relative flex h-full flex-col overflow-hidden rounded-[6px] shadow-[inset_0_2px_8px_rgba(0,0,0,.35)]"
        style={{ background: light ? '#eef3e2' : '#d8e4c4' }}
      >
        {children}
        <div aria-hidden className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(31,42,28,.06)_0_1px,transparent_1px_3px)]" />
      </div>
    </div>
  )
}

function PadButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="grid h-[17px] w-8 place-items-center rounded-[4px] border-2 border-[#121318] bg-[linear-gradient(#3a3f4d,#1d2029)] text-[8px] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,.2)] hover:brightness-125 active:translate-y-px disabled:opacity-45 @min-[40rem]:h-[20px] @min-[40rem]:w-9"
    >
      {children}
    </button>
  )
}

function Grille({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`grid-cols-4 gap-1 ${className}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="size-1.5 rounded-full bg-[#5b0c12] shadow-[inset_0_1px_1px_rgba(0,0,0,.6),0_1px_0_rgba(255,255,255,.25)]" />
      ))}
    </span>
  )
}

/** 3D ビューア:ターンテーブル+リムライト。選ぶたびに走査線が下から上へ通り、黒いシルエットから色が戻る */
function Viewer({ mon, known, reduced, scan }: { mon: MonsterData; known: boolean; reduced: boolean; scan: number }) {
  const U = useMemo(() => {
    const u = makeMonUniforms()
    u.uSil.value = 1
    u.uRim.value = 0.9
    return u
  }, [])
  useEffect(() => {
    if (!known) {
      U.uScan.value = -10
      return
    }
    if (reduced) {
      U.uScan.value = 10
      return
    }
    const c = animate(U.uScan, { value: [-0.25, 2.3] }, { duration: 1.1, ease: [0.4, 0, 0.3, 1], delay: 0.15 })
    return () => c.stop()
  }, [mon, known, reduced, scan, U])
  return (
    <div className="relative aspect-square w-[42%] max-w-[240px] shrink-0 cursor-grab @min-[34rem]/detail:h-full @min-[34rem]/detail:max-h-[420px] @min-[34rem]/detail:w-auto @min-[34rem]/detail:max-w-[46%] @min-[34rem]/detail:self-center overflow-hidden rounded-[6px] border-2 border-[#1f2a1c]/70 bg-[radial-gradient(circle_at_50%_40%,#ffffff,#e4ecd2)] active:cursor-grabbing">
      <div aria-hidden className="absolute inset-0 [background-image:linear-gradient(rgba(31,42,28,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(31,42,28,.07)_1px,transparent_1px)] [background-size:12.5%_12.5%]" />
      <Canvas dpr={[1, 1.75]} camera={{ fov: 32, position: [0, 1.45, 3.9] }} gl={{ antialias: true, alpha: true }} aria-label={`${known ? mon.name : '未発見'}の3Dモデル。ドラッグで回転`}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} />
        <directionalLight position={[-2, 2, -4]} intensity={2.4} color="#bfe9ff" />
        <Turntable reduced={reduced} />
        <Fit name={mon.name}>
          <Monster3D key={mon.name} name={mon.name} uniforms={U} still={reduced} />
        </Fit>
        <OrbitControls makeDefault enablePan={false} enableZoom={false} autoRotate={!reduced} autoRotateSpeed={2.2} minPolarAngle={0.9} maxPolarAngle={1.55} enableDamping />
      </Canvas>
      {!known && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[12%] text-center font-['Press_Start_2P'] text-[20px] text-[#1f2a1c]/70 motion-safe:animate-[dx-blink_1.4s_steps(1)_infinite]">
          ?
        </span>
      )}
      <span className="pointer-events-none absolute top-1 left-1.5 font-['VT323'] text-[13px] leading-none text-[#1f2a1c]/60">SCAN 3D</span>
      <span className="pointer-events-none absolute right-1.5 bottom-1 font-['VT323'] text-[12px] leading-none text-[#1f2a1c]/50">DRAG</span>
    </div>
  )
}

/** モデルの外接球(+ターンテーブルの上面)が視野に収まる距離へカメラを置き直す。縦長・横長・浮遊モデルでも余白を残す */
function Fit({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  useEffect(() => {
    const g = ref.current
    if (!g || !controls) return
    g.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(g)
    // 揺れ・羽ばたきの分の余裕と、足元のターンテーブル上面
    box.expandByVector(new THREE.Vector3(0.05, 0.1, 0.05))
    box.union(new THREE.Box3(new THREE.Vector3(-0.9, -0.1, -0.9), new THREE.Vector3(0.9, 0, 0.9)))
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const aspect = width / Math.max(1, height)
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    const dist = (sphere.radius * 0.98) / Math.sin(Math.min(vfov, hfov) / 2)
    const dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.35, 1)
    dir.normalize()
    controls.target.copy(sphere.center)
    camera.position.copy(sphere.center).addScaledVector(dir, dist)
    camera.near = Math.max(0.01, dist - sphere.radius * 2)
    camera.far = dist + sphere.radius * 4
    camera.updateProjectionMatrix()
    controls.update()
  }, [name, camera, controls, width, height])
  return <group ref={ref}>{children}</group>
}

function Turntable({ reduced }: { reduced: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current && !reduced) ring.current.rotation.z = clock.elapsedTime * 0.8
  })
  return (
    <group>
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.14, 48]} />
        <meshToonMaterial color="#3a3f4d" />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.98, 48]} />
        <meshToonMaterial color="#59606f" />
      </mesh>
      <mesh ref={ring} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.86, 0.92, 48, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#7dffb0" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Detail({ mon, known, reduced, scan }: { mon: MonsterData; known: boolean; reduced: boolean; scan: number }) {
  const k = `${mon.no}-${scan}`
  return (
    <div className="@container/detail h-full min-h-0 overflow-y-auto p-2 text-[#1f2a1c] [scrollbar-width:thin] @min-[40rem]:p-3">
      {/* 広いときは「ビューア | 情報+能力値+説明」の2カラム、狭いときは縦積み */}
      <div className="flex min-h-full flex-col gap-2 @min-[34rem]/detail:h-full @min-[34rem]/detail:flex-row @min-[40rem]:gap-3">
        <div className="flex gap-2.5 @min-[34rem]/detail:contents">
          <Viewer mon={mon} known={known} reduced={reduced} scan={scan} />
          <div className="flex min-w-0 flex-1 @min-[34rem]/detail:hidden">
            <InfoTop key={k} mon={mon} known={known} reduced={reduced} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[34rem]/detail:justify-center-safe">
          <div className="hidden @min-[34rem]/detail:flex">
            <InfoTop key={k} mon={mon} known={known} reduced={reduced} />
          </div>
          <StatsFlavor key={k} mon={mon} known={known} reduced={reduced} />
        </div>
      </div>
    </div>
  )
}

const fadeIn = (reduced: boolean, known: boolean, delay: number) =>
  reduced ? {} : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { delay: known ? delay : 0.05, duration: 0.3 } }

function InfoTop({ mon, known, reduced }: { mon: MonsterData; known: boolean; reduced: boolean }) {
  const fade = (d: number) => fadeIn(reduced, known, d)
  return (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <motion.p {...fade(0.5)} className="font-['VT323'] text-[18px] leading-none @min-[40rem]:text-[22px]">
          No.{String(mon.no).padStart(3, '0')}
        </motion.p>
        <motion.h3 {...fade(0.6)} className="truncate text-[18px] leading-tight font-black tracking-wide @min-[30rem]/detail:text-[22px]">
          {known ? mon.name : '？？？'}
        </motion.h3>
        <motion.p {...fade(0.68)} className="truncate text-[11px] font-bold opacity-75 @min-[30rem]/detail:text-[12px]">
          {known ? mon.category : '？？？ モンスター'}
        </motion.p>
        <motion.div {...fade(0.76)} className="flex flex-wrap gap-1">
          {known ? (
            mon.types.map((t) => <TypeBadge key={t} type={t} />)
          ) : (
            <span className="rounded-[4px] bg-[#1f2a1c]/25 px-1.5 text-[10px] font-black text-[#1f2a1c]/70">？？？</span>
          )}
        </motion.div>
        <motion.dl {...fade(0.84)} className="mt-0.5 grid w-full max-w-[220px] grid-cols-[auto_1fr] gap-x-2 border-t border-dashed border-[#1f2a1c]/35 pt-1 text-[11px] font-bold @min-[30rem]/detail:text-[12px]">
          <dt className="opacity-70">たかさ</dt>
          <dd className="text-right font-['VT323'] text-[16px] leading-none">{known ? `${mon.height.toFixed(1)} m` : '??.? m'}</dd>
          <dt className="opacity-70">おもさ</dt>
          <dd className="text-right font-['VT323'] text-[16px] leading-none">{known ? `${mon.weight.toFixed(1)} kg` : '???.? kg'}</dd>
        </motion.dl>
      </div>
  )
}

function StatsFlavor({ mon, known, reduced }: { mon: MonsterData; known: boolean; reduced: boolean }) {
  const flavor = known ? mon.flavor : 'データが ありません。やせいで であうと じどうで とうろく されます。'
  const [typed, setTyped] = useState(reduced ? flavor.length : 0)

  useEffect(() => {
    if (reduced) return
    let n = 0
    let id = 0
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        n += 1
        setTyped(n)
        if (n >= flavor.length) window.clearInterval(id)
      }, 26)
    }, known ? 1100 : 250)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(id)
    }
  }, [flavor, known, reduced])

  return (
      <div className="grid gap-2 @min-[26rem]/detail:grid-cols-[1.05fr_1fr] @min-[34rem]/detail:grid-cols-1 @min-[44rem]/detail:grid-cols-[1.05fr_1fr] @min-[40rem]:gap-3">
        <dl className="grid content-start gap-[3px]">
          {STAT_LABELS.map(([key, label], i) => {
            const v = mon.stats[key]
            return (
              <div key={key} className="grid grid-cols-[4.2em_2.2em_1fr] items-center gap-1.5 text-[11px] font-bold">
                <dt className="opacity-75">{label}</dt>
                <dd className="text-right font-['VT323'] text-[15px] leading-none">{known ? v : '---'}</dd>
                <div className="h-[9px] overflow-hidden rounded-[2px] border border-[#1f2a1c]/40 bg-[#1f2a1c]/8">
                  {known && (
                    <motion.div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, (v / 140) * 100)}%`,
                        transformOrigin: 'left',
                        background: `repeating-linear-gradient(90deg, ${v >= 80 ? '#2f8f4e' : v >= 55 ? LCD : '#b8862a'} 0 5px, transparent 5px 6px)`,
                      }}
                      initial={reduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.9 + i * 0.06, duration: 0.45, ease: 'easeOut' }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </dl>
        <div className="relative min-h-[4.5em] rounded-[6px] border-2 border-[#1f2a1c]/60 bg-[#f8fbef]/70 px-2 py-1.5 text-[11.5px] leading-[1.7] font-bold @min-[40rem]:text-[12.5px]">
          <span aria-hidden>{flavor.slice(0, typed)}</span>
          {typed < flavor.length && <span aria-hidden className="ml-px inline-block h-[1em] w-[0.5em] translate-y-[2px] bg-[#1f2a1c] motion-safe:animate-[dx-caret_.6s_steps(1)_infinite]" />}
          <span className="sr-only">{flavor}</span>
        </div>
      </div>
  )
}
