import { Billboard, PerformanceMonitor, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import confetti from 'canvas-confetti'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { BlendFunction, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import * as THREE from 'three'

/**
 * ソーシャルゲーム風のガチャ(召喚)演出。単発 / 10連。
 * - 召喚ステージは React Three Fiber。魔法陣は 2D canvas に描いた3層のテクスチャを加算合成の板に貼って床に寝かせ、層ごとに逆回転
 * - 渦を巻いて昇る粒子(1800 個)は位置を頂点シェーダで計算、光柱はフレネル風の GLSL。溜め中はカメラが押し込み、結果表示では引く
 * - Bloom の強さ・色収差・魔法陣の色を useFrame で目標値へ補間(React の再描画なし)。虹では色相が回り、色収差が脈打つ
 * - カードは DOM のまま。ポインタ位置を CSS 変数に書いて傾きとホロ箔(color-dodge の虹帯)を動かす
 * - 予兆演出: 光の色が 青 → 金 → 虹 と結果の最高レアまで段階的に昇格。昇格ごとに衝撃波リング、虹では画面フラッシュと揺れ
 * - カードは rotateY + backface-visibility の両面構造。裏面の縁の光でもレア度をほのめかし、★5 はめくる直前にため(揺れ)が入る
 * - 「すべてめくる」は ★5 を最後に回して順番にめくる。★5 が表になると canvas-confetti(デモ内の canvas にバインド)で紙吹雪
 * - ★5 の枠は回転する conic-gradient、★4 は金の衝撃リング。スキップで結果へ直行、useReducedMotion 時は演出なしで結果を即時表示
 */

type Rarity = 3 | 4 | 5
type Unit = { title: string; name: string; hue: number; hair: number; weapon: number }
type Pull = Unit & { rarity: Rarity; id: string }
type Level = 'blue' | 'gold' | 'rainbow'
type Phase = 'idle' | 'charging' | 'reveal'

const POOL: Record<Rarity, Unit[]> = {
  5: [
    { title: '星詠みの魔女', name: 'アステル', hue: 275, hair: 1, weapon: 1 },
    { title: '黄昏の剣聖', name: 'ヴァルド', hue: 28, hair: 0, weapon: 0 },
    { title: '暁光の竜姫', name: 'ルミナ', hue: 340, hair: 2, weapon: 2 },
  ],
  4: [
    { title: '風読みの射手', name: 'シルフィ', hue: 150, hair: 2, weapon: 3 },
    { title: '紅蓮の拳士', name: 'カグラ', hue: 6, hair: 0, weapon: 4 },
    { title: '月影の密偵', name: 'ノクス', hue: 232, hair: 3, weapon: 0 },
    { title: '聖樹の守人', name: 'エルム', hue: 95, hair: 1, weapon: 1 },
  ],
  3: [
    { title: '見習い剣士', name: 'ロイ', hue: 205, hair: 0, weapon: 0 },
    { title: '旅の薬師', name: 'ミナ', hue: 175, hair: 1, weapon: 1 },
    { title: '森の弓兵', name: 'ケイ', hue: 120, hair: 2, weapon: 3 },
    { title: '港町の衛兵', name: 'ガロ', hue: 215, hair: 3, weapon: 2 },
    { title: '放浪の詩人', name: 'リュート', hue: 190, hair: 1, weapon: 4 },
  ],
}

const RATE = { 5: 0.03, 4: 0.17 }
const COST = { 1: 300, 10: 3000 } as const
const START_GEMS = 9000

const RAINBOW = 'conic-gradient(from 0deg, #ff5e9c, #ffd36e, #7dffb2, #5ec8ff, #b98bff, #ff5e9c)'
const R_STYLE: Record<Rarity, { color: string; glow: string; frame: string; stars: string }> = {
  3: { color: '#6cc7ff', glow: 'rgba(108,199,255,.45)', frame: 'linear-gradient(160deg, #d9efff, #5a86b5 45%, #22344f)', stars: '★★★' },
  4: { color: '#ffcf4a', glow: 'rgba(255,200,70,.65)', frame: 'linear-gradient(160deg, #fff6c9, #e6a92b 45%, #7a4b0c)', stars: '★★★★' },
  5: { color: '#ff8ee0', glow: 'rgba(255,140,220,.8)', frame: RAINBOW, stars: '★★★★★' },
}
const LEVEL_COLOR: Record<Level, string> = { blue: '#58c4ff', gold: '#ffc83d', rainbow: '#ff5ea8' }
const LEVEL_TEXT: Record<Level, string> = { blue: '星の声が聞こえる……', gold: '強い輝きを感じる!', rainbow: '虹の奔流——!!' }

/**
 * 演出の途中で初めて出る文字(日本語フォントの未読込サブセット)があると、読み込み完了時にページ全体のレイアウトがやり直しになり、
 * いちばん盛り上がる瞬間にカクつく。マウント時に使う文字をまとめて先読みしておく
 */
const WARM_TEXT = [
  ...Object.values(LEVEL_TEXT),
  ...Object.values(POOL).flat().flatMap((u) => [u.title, u.name]),
  '魔法陣に星の力が満ちている星詠みの召喚星晶石を補充単発召喚10連召喚確定デモ用召喚中スキップカードをタップしてめくるすべてめくる結果もう一度とじる体枚目',
  '★×✓≫…!0123456789,%/',
].join('')

let pullSeq = 0
function roll(count: 1 | 10, forceTop: boolean): Pull[] {
  const pick = (r: Rarity): Pull => {
    const list = POOL[r]
    return { ...list[Math.floor(Math.random() * list.length)], rarity: r, id: `p${++pullSeq}` }
  }
  const out = Array.from({ length: count }, () => {
    const x = Math.random()
    return pick(x < RATE[5] ? 5 : x < RATE[5] + RATE[4] ? 4 : 3)
  })
  if (count === 10 && out.every((p) => p.rarity === 3)) out[9] = pick(4)
  if (forceTop && !out.some((p) => p.rarity === 5)) out[Math.floor(Math.random() * count)] = pick(5)
  return out
}

/* ───────── 絵 ───────── */

const HAIR = [
  'M33 74 32 58 40 48 52 45 63 50 68 60 67 76 62 64 58 70 55 58 50 66 46 57 41 67 38 60Z',
  'M32 98C28 70 34 50 50 50s22 20 18 48h-6l1-28c-5-6-21-6-26 0l1 28Z',
  'M34 70c0-14 8-20 17-20s15 6 16 14l13 12-6 6-8-12-22-8-6 10Z',
  'M30 82c0-22 10-34 20-34s20 12 20 34h-6c0-14-6-20-14-20s-14 6-14 20Z',
]

function Portrait({ u, rarity }: { u: Unit; rarity: Rarity }) {
  const dark = `hsl(${u.hue} 40% 12%)`
  const rim = `hsl(${u.hue} 95% 74%)`
  const weapon = [
    <g key="w" transform="rotate(16 76 90)" fill={rim}>
      <path d="M74 20h5l2 86h-9Z" />
      <path d="M66 104h21v5H66Z" />
    </g>,
    <g key="w" stroke={rim} strokeWidth="3" strokeLinecap="round">
      <path d="M24 26 30 150" />
      <circle cx="24" cy="22" r="7" fill={rim} stroke="none" />
    </g>,
    <g key="w" stroke={rim} strokeWidth="3">
      <path d="M82 18 70 150" />
      <path d="M78 4l10 16H76Z" fill={rim} stroke="none" />
    </g>,
    <g key="w" fill="none" stroke={rim} strokeWidth="2.5">
      <path d="M78 28q22 52 0 104" />
      <path d="M78 28v104" strokeWidth="1" />
    </g>,
    <g key="w" fill="none" stroke={rim} strokeWidth="2" opacity=".8">
      <circle cx="50" cy="96" r="30" />
      <circle cx="50" cy="96" r="40" strokeDasharray="3 6" />
    </g>,
  ][u.weapon]
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      {rarity >= 4 &&
        Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 70 46 -40h8Z" fill="#fff" opacity=".12" transform={`rotate(${i * 30} 50 70)`} />
        ))}
      {weapon}
      <g fill={dark} stroke={rim} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 152c2-32 18-48 38-48s36 16 38 48Z" />
        <ellipse cx="50" cy="72" rx="15" ry="18" />
        <path d={HAIR[u.hair]} />
      </g>
      <path d="M42 74l5 1-5 2ZM58 74l-5 1 5 2Z" fill={rim} />
      <path d="M44 120 50 136l6-16Z" fill={rim} opacity=".8" />
    </svg>
  )
}

/** カード裏面の菱形格子(1度だけ組み立てる) */
const LATTICE = (() => {
  let d = ''
  for (let k = -150; k <= 250; k += 14) d += `M${k} 0l150 150M${k} 150l150-150`
  return d
})()

/* ───────── カード ───────── */

function Card({
  pull,
  index,
  flipped,
  charging,
  reduced,
  onFlip,
  cardRef,
}: {
  pull: Pull
  index: number
  flipped: boolean
  charging: boolean
  reduced: boolean
  onFlip: () => void
  cardRef: (el: HTMLButtonElement | null) => void
}) {
  const s = R_STYLE[pull.rarity]
  // ポインタ位置を CSS 変数に書くだけ(再描画なし)。ホロの光沢と傾きに使う
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced) return
    const el = e.currentTarget
    const b = el.getBoundingClientRect()
    const x = (e.clientX - b.left) / b.width
    const y = (e.clientY - b.top) / b.height
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    el.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(1)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(1)}deg`)
  }
  const onLeave = (e: PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget
    for (const [k, v] of [['--mx', '50%'], ['--my', '35%'], ['--rx', '0deg'], ['--ry', '0deg']]) el.style.setProperty(k, v)
  }
  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={onFlip}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={flipped ? `${s.stars} ${pull.title} ${pull.name}` : `${index + 1}枚目のカードをめくる`}
      className="@container relative aspect-[2/3] w-full rounded-[8%] outline-none [perspective:900px] focus-visible:ring-2 focus-visible:ring-white"
      initial={reduced ? false : { opacity: 0, y: -50, scale: 0.4, rotate: (index % 2 ? 1 : -1) * 20 }}
      animate={charging && !reduced ? { opacity: 1, y: 0, scale: 1, rotate: 0, x: [0, -3, 3, -3, 3, -2, 0] } : { opacity: 1, y: 0, scale: 1, rotate: 0, x: 0 }}
      transition={
        charging
          ? { x: { duration: 0.38 } }
          : { type: 'spring', stiffness: 380, damping: 24, delay: reduced ? 0 : index * 0.06, x: { duration: 0.1 } }
      }
      whileHover={!flipped && !reduced ? { y: -4 } : undefined}
    >
      {/* めくれたときのリング */}
      {flipped && pull.rarity >= 4 && !reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[8%] border-2"
          style={{ borderColor: s.color }}
          initial={{ opacity: 1, scale: 0.9 }}
          animate={{ opacity: 0, scale: pull.rarity === 5 ? 1.9 : 1.5 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
        />
      )}
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out [transform-style:preserve-3d]"
        style={{ transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
      >
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, ease: [0.3, 1.4, 0.5, 1] }}
      >
        {/* 裏 */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[8%] border border-white/25 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
          style={{
            background: 'linear-gradient(160deg, #222a63, #0b0f2c 70%)',
            boxShadow: `0 0 ${pull.rarity === 3 ? 8 : 18}px ${s.glow}, inset 0 0 ${pull.rarity === 3 ? 6 : 16}px ${s.glow}`,
          }}
        >
          {pull.rarity === 5 && <span aria-hidden className="absolute inset-[-50%] opacity-40 [animation:gs-spin_2.4s_linear_infinite]" style={{ background: RAINBOW }} />}
          <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-[5%] size-[90%]" aria-hidden>
            <rect x="1" y="1" width="98" height="148" rx="6" fill="#0b0f2c" stroke="#d9b45a" strokeWidth="1.2" />
            <path d={LATTICE} stroke="#d9b45a" strokeWidth=".4" opacity=".35" />
            <g transform="translate(50 75)" fill="none" stroke="#e8c770" strokeWidth="1.4">
              <circle r="20" />
              <circle r="25" strokeWidth=".5" />
              <path d="M0-30 6-6 30 0 6 6 0 30-6 6-30 0-6-6Z" fill="#e8c770" fillOpacity=".25" />
            </g>
          </svg>
        </div>
        {/* 表 */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[8%] p-[4.5%] [backface-visibility:hidden] [transform:rotateY(180deg)] [-webkit-backface-visibility:hidden]"
          style={{ background: pull.rarity === 5 ? '#fff' : s.frame, boxShadow: flipped ? `0 0 ${pull.rarity * 6 - 12}px ${s.glow}` : undefined }}
        >
          {pull.rarity === 5 && <span aria-hidden className="absolute inset-[-50%] [animation:gs-spin_3s_linear_infinite]" style={{ background: RAINBOW }} />}
          <div
            className="relative h-full overflow-hidden rounded-[6%]"
            style={{ background: `radial-gradient(circle at 50% 42%, hsl(${pull.hue} 75% 52%), hsl(${(pull.hue + 40) % 360} 60% 14%) 75%)` }}
          >
            <Portrait u={pull} rarity={pull.rarity} />
            {/* ホロ箔: 虹の帯がポインタに合わせて流れ、光の当たりが追従する */}
            {pull.rarity >= 4 && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
                style={{
                  opacity: pull.rarity === 5 ? 0.7 : 0.4,
                  backgroundImage:
                    pull.rarity === 5
                      ? 'repeating-linear-gradient(115deg, #ff5e9c 0%, #ffd36e 6%, #7dffb2 12%, #5ec8ff 18%, #b98bff 24%, #ff5e9c 30%)'
                      : 'repeating-linear-gradient(115deg, #fff0b0 0%, #c98a12 8%, #fff8dc 16%, #e6a92b 24%, #fff0b0 32%)',
                  backgroundSize: '260% 260%',
                  backgroundPosition: 'var(--mx, 50%) var(--my, 35%)',
                  maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 85%)',
                  WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 85%)',
                }}
              />
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{ background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,.9), transparent 48%)', opacity: 0.25 + pull.rarity * 0.1 }}
            />
            {flipped && pull.rarity >= 4 && !reduced && (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent mix-blend-overlay [animation:gs-sheen_.9s_ease-out_.35s_both]" />
            )}
            <span
              className="absolute top-[3%] left-[5%] text-[clamp(7px,10cqw,15px)] leading-none tracking-[-.1em]"
              style={{ color: pull.rarity === 5 ? '#fff' : s.color, textShadow: `0 0 6px ${s.glow}, 0 1px 0 #000` }}
            >
              {s.stars}
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-[6%] pt-[18%] pb-[5%] text-left leading-tight">
              <span className="block truncate text-[clamp(6px,8.5cqw,11px)] text-white/75">{pull.title}</span>
              <span className="block truncate text-[clamp(8px,13cqw,18px)] font-black text-white">{pull.name}</span>
            </span>
          </div>
        </div>
      </motion.div>
      </div>
    </motion.button>
  )
}

/* ───────── 3D 召喚ステージ (React Three Fiber) ───────── */

const IDLE_COLOR = new THREE.Color('#6d85ff')
const WHITE3 = new THREE.Color('#ffffff')
const LV3: Record<Level, THREE.Color> = { blue: new THREE.Color('#3fb2ff'), gold: new THREE.Color('#ff9612'), rainbow: new THREE.Color('#ff5ea8') }
const RARITY3: Record<Rarity, THREE.Color> = { 3: new THREE.Color('#4fa8ff'), 4: new THREE.Color('#ff9612'), 5: new THREE.Color('#ff6ad5') }

/** 魔法陣の各層を 2D canvas に白線で描き、加算合成の板に貼る(色はマテリアル側で乗算) */
function circleTexture(kind: 'outer' | 'hex' | 'inner') {
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const paint = () => {
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 1024, 1024)
    g.save()
    g.translate(512, 512)
    g.scale(5.12, 5.12)
    g.strokeStyle = g.fillStyle = '#fff'
    g.lineCap = g.lineJoin = 'round'
    const ring = (r: number, w: number, dash?: number[]) => {
      g.setLineDash(dash ?? [])
      g.lineWidth = w
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.stroke()
      g.setLineDash([])
    }
    const knot = (x: number, y: number, r: number) => {
      g.globalCompositeOperation = 'destination-out'
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
      g.globalCompositeOperation = 'source-over'
      g.lineWidth = 0.6
      g.stroke()
      g.beginPath()
      g.arc(x, y, r * 0.35, 0, Math.PI * 2)
      g.fill()
    }
    if (kind === 'outer') {
      ring(97, 1)
      ring(93.5, 0.4)
      ring(70, 0.9)
      ring(66.5, 0.35)
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2
        const r2 = i % 10 === 0 ? 86 : 90
        g.lineWidth = i % 10 === 0 ? 0.7 : 0.3
        g.beginPath()
        g.moveTo(Math.cos(a) * 93.5, Math.sin(a) * 93.5)
        g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
        g.stroke()
      }
      const phrase = '✦ AD ASTRA · VOCO TE · LUMEN STELLAE · SIGNUM CAELI · '
      const chars = [...phrase.repeat(3)].slice(0, 86)
      g.font = "italic 600 6.6px 'Playfair Display', Georgia, serif"
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      chars.forEach((ch, i) => {
        g.save()
        g.rotate((i / chars.length) * Math.PI * 2)
        g.translate(0, -78.5)
        g.fillText(ch, 0, 0)
        g.restore()
      })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        knot(Math.cos(a) * 97, Math.sin(a) * 97, 3.4)
      }
    } else if (kind === 'hex') {
      ring(64, 0.35, [1.5, 2.5])
      g.lineWidth = 0.9
      for (const off of [0, Math.PI]) {
        g.beginPath()
        for (let i = 0; i < 3; i++) {
          const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2
          if (i) g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62)
          else g.moveTo(Math.cos(a) * 62, Math.sin(a) * 62)
        }
        g.closePath()
        g.stroke()
      }
      g.lineWidth = 0.4
      g.beginPath()
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2
        if (i) g.lineTo(Math.cos(a) * 36, Math.sin(a) * 36)
        else g.moveTo(Math.cos(a) * 36, Math.sin(a) * 36)
      }
      g.stroke()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        knot(Math.cos(a) * 62, Math.sin(a) * 62, 5.5)
      }
    } else {
      ring(30, 0.8)
      ring(26, 0.3)
      ring(12, 0.4, [1, 1.6])
      g.beginPath()
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 ? 7 : i % 4 ? 22 : 29
        if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        else g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      g.closePath()
      g.globalAlpha = 0.25
      g.fill()
      g.globalAlpha = 1
      g.lineWidth = 0.7
      g.stroke()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.save()
        g.rotate(a)
        g.beginPath()
        g.moveTo(-1.6, -44)
        g.lineTo(0, -49)
        g.lineTo(1.6, -44)
        g.closePath()
        g.fill()
        g.restore()
      }
      ring(46.5, 0.3)
    }
    g.restore()
    tex.needsUpdate = true
  }
  paint()
  if (kind === 'outer') document.fonts?.load("italic 600 12px 'Playfair Display'").then(paint, () => {})
  return tex
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.18, 'rgba(255,255,255,.55)')
  grd.addColorStop(0.5, 'rgba(255,255,255,.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const additive = (map?: THREE.Texture) =>
  new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })

const PILLAR_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`
const PILLAR_FS = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float core = pow(abs(dot(vN, vV)), 2.2);
  float fade = pow(1.0 - vUv.y, 1.7) * smoothstep(0.0, 0.04, vUv.y);
  float streak = 0.7 + 0.3 * sin(vUv.x * 56.0 + vUv.y * 14.0 - uTime * 5.0);
  float a = (core * 0.85 + 0.15) * fade * streak * uIntensity;
  gl_FragColor = vec4(uColor * 1.8 * a, a);
}`

/** 渦を巻きながら中心へ吸い込まれて昇る粒子。位置はすべて頂点シェーダで計算し、CPU は位相を進めるだけ */
const SWIRL_VS = /* glsl */ `
attribute vec4 aSeed;
uniform float uPhase; uniform float uCharge; uniform float uPx;
varying float vAlpha; varying float vHue;
void main() {
  float life = fract(aSeed.w + uPhase * (0.25 + aSeed.z * 0.3));
  float r = mix(2.9, 0.12, pow(life, 0.8)) * (0.55 + 0.45 * aSeed.y);
  float ang = aSeed.x + uPhase * (0.8 + aSeed.z) + life * 7.0;
  float y = 0.04 + life * life * mix(0.6, 3.8, uCharge);
  vec4 mv = modelViewMatrix * vec4(cos(ang) * r, y, sin(ang) * r, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.5 + aSeed.y) * (0.7 + uCharge * 0.8) / -mv.z;
  vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.82, 1.0, life)) * (0.22 + uCharge * 0.78);
  vHue = aSeed.x / 6.2831 + life * 0.35;
}`
const SWIRL_FS = /* glsl */ `
uniform vec3 uColor; uniform float uRainbow;
varying float vAlpha; varying float vHue;
vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a * vAlpha;
  vec3 col = mix(uColor, hue(vHue) * 1.2 + 0.15, uRainbow) * 1.5;
  gl_FragColor = vec4(col * a, a);
}`
const SWIRL_COUNT = 1800

/**
 * R3F の自動計測(react-use-measure)がレイアウト確定前の寸法を拾ったままになる環境があるため、
 * キャンバスの親要素を ResizeObserver + 定期チェックで見張り、ずれていれば setSize で合わせ直す
 */
function AutoFit() {
  const gl = useThree((st) => st.gl)
  const get = useThree((st) => st.get)
  useEffect(() => {
    const host = gl.domElement.parentElement?.parentElement
    if (!host) return
    const fit = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      const { size, setSize } = get()
      if (w > 0 && h > 0 && (Math.abs(size.width - w) > 0.5 || Math.abs(size.height - h) > 0.5)) setSize(w, h)
    }
    const ro = new ResizeObserver(fit)
    ro.observe(host)
    const id = window.setInterval(fit, 400)
    fit()
    return () => {
      ro.disconnect()
      window.clearInterval(id)
    }
  }, [gl, get])
  return null
}

function SummonStage({ phase, level, best, reduced }: { phase: Phase; level: Level | null; best: Rarity; reduced: boolean }) {
  const r = useMemo(() => {
    const tex = { outer: circleTexture('outer'), hex: circleTexture('hex'), inner: circleTexture('inner'), glow: glowTexture() }
    const mat = {
      outer: additive(tex.outer),
      hex: additive(tex.hex),
      inner: additive(tex.inner),
      halo: additive(tex.inner),
      floor: additive(tex.glow),
      orb: additive(tex.glow),
      gyro: additive(),
      shock: additive(),
      pillar: new THREE.ShaderMaterial({
        vertexShader: PILLAR_VS,
        fragmentShader: PILLAR_FS,
        uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        premultipliedAlpha: true,
      }),
      swirl: new THREE.ShaderMaterial({
        vertexShader: SWIRL_VS,
        fragmentShader: SWIRL_FS,
        uniforms: { uPhase: { value: 0 }, uCharge: { value: 0 }, uPx: { value: 60 }, uColor: { value: new THREE.Color() }, uRainbow: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
      }),
    }
    const swirlGeo = new THREE.BufferGeometry()
    const seeds = new Float32Array(SWIRL_COUNT * 4)
    for (let i = 0; i < SWIRL_COUNT; i++) seeds.set([Math.random() * Math.PI * 2, Math.random(), Math.random(), Math.random()], i * 4)
    swirlGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SWIRL_COUNT * 3), 3))
    swirlGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    return { tex, mat, swirlGeo }
  }, [])
  useEffect(
    () => () => {
      Object.values(r.tex).forEach((t) => t.dispose())
      Object.values(r.mat).forEach((m) => m.dispose())
      r.swirlGeo.dispose()
    },
    [r],
  )

  const outer = useRef<THREE.Mesh>(null)
  const hex = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const gyro = useRef<THREE.Group>(null)
  const orb = useRef<THREE.Mesh>(null)
  const shock = useRef<THREE.Mesh>(null)
  const bloom = useRef<BloomEffect>(null)
  const ca = useRef<ChromaticAberrationEffect>(null)
  const caOffset = useMemo(() => new THREE.Vector2(), [])
  const s = useRef({ color: IDLE_COLOR.clone(), charge: 0, spin: 0.12, angle: 0, phase: 0, rainbow: 0, bloom: 0.9, shock: -9, tmp: new THREE.Color(), v: new THREE.Vector3(), look: new THREE.Vector3(0, 0.4, 0) })
  const clock = useThree((st) => st.clock)
  const invalidate = useThree((st) => st.invalidate)

  useEffect(() => {
    if (phase === 'charging' && level) s.current.shock = clock.elapsedTime
    invalidate()
  }, [phase, level, best, clock, invalidate])
  // 全マテリアルのシェーダを最初にまとめてコンパイルし、召喚開始時の引っかかりを防ぐ
  const gl = useThree((st) => st.gl)
  const scene = useThree((st) => st.scene)
  const camera = useThree((st) => st.camera)
  useEffect(() => {
    gl.compile(scene, camera)
  }, [gl, scene, camera])
  // frameloop="demand"(動きを減らす設定)でも、テクスチャやフォント、ポストエフェクトの準備後に描き直す
  useEffect(() => {
    const ids = [60, 300, 1000].map((ms) => window.setTimeout(invalidate, ms))
    return () => ids.forEach(clearTimeout)
  }, [invalidate])

  useFrame((state, rawDt) => {
    const st = s.current
    const dt = reduced ? 0 : Math.min(rawDt, 0.05)
    // 動きを減らす設定では時間を止める(スクロールなどで再描画されたときに光の柱や色だけが動いて見えないように)
    const t = reduced ? 0 : state.clock.elapsedTime
    const ease = (rate: number) => (reduced ? 1 : 1 - Math.exp(-dt * rate))
    const charging = phase === 'charging'
    const boost = charging ? (level === 'rainbow' ? 1.7 : level === 'gold' ? 1.3 : 1) : 1

    if (charging && level === 'rainbow') st.tmp.setHSL((t * 0.5) % 1, 0.95, 0.6)
    else st.tmp.copy(charging && level ? LV3[level] : phase === 'reveal' ? RARITY3[best] : IDLE_COLOR)
    st.color.lerp(st.tmp, ease(6))
    st.charge += ((charging ? 1 : phase === 'reveal' ? 0.22 : 0) - st.charge) * ease(charging ? 1.2 : 2.5)
    st.spin += ((charging ? 1.5 * boost : 0.12) - st.spin) * ease(1.6)
    st.angle += st.spin * dt
    st.phase += dt * (0.18 + st.charge * 1.1 * boost)
    st.rainbow += ((charging && level === 'rainbow') || (phase === 'reveal' && best === 5) ? 1 - st.rainbow : -st.rainbow) * ease(3)

    if (outer.current) outer.current.rotation.z = st.angle * 0.45
    if (hex.current) hex.current.rotation.z = -st.angle * 0.8
    if (inner.current) inner.current.rotation.z = st.angle * 1.5
    if (halo.current) {
      halo.current.rotation.z = -st.angle * 1.1
      halo.current.position.y = 0.6 + st.charge * 1.3
      halo.current.scale.setScalar(0.55 + st.charge * 0.15)
    }
    if (gyro.current) {
      gyro.current.rotation.y = st.angle * 0.7
      gyro.current.children.forEach((c, i) => (c.rotation.x = Math.PI / 2 + Math.sin(t * 0.6 + i * 2) * 0.5 + i * 0.6))
      gyro.current.position.y = 0.4 + st.charge * 1.1
    }

    const glow = 0.5 + st.charge * 1.3 * (1 + (boost - 1) * 0.4)
    const col = st.tmp.copy(st.color).multiplyScalar(glow)
    r.mat.outer.color.copy(col)
    r.mat.hex.color.copy(col)
    r.mat.inner.color.copy(col).multiplyScalar(1.2)
    r.mat.halo.color.copy(col)
    r.mat.halo.opacity = Math.min(1, st.charge * 1.3)
    r.mat.gyro.color.copy(col).multiplyScalar(1.3)
    r.mat.gyro.opacity = Math.min(1, st.charge * 1.4)
    r.mat.floor.color.copy(st.color).multiplyScalar(0.25 + st.charge * 0.9)
    r.mat.orb.color.copy(st.color).lerp(WHITE3, 0.3).multiplyScalar(1.3)
    r.mat.orb.opacity = Math.min(1, st.charge * 1.4)
    const pu = r.mat.pillar.uniforms
    pu.uColor.value.copy(st.color)
    pu.uIntensity.value = 0.06 + st.charge * 0.7 * (1 + (boost - 1) * 0.3)
    pu.uTime.value = t
    const su = r.mat.swirl.uniforms
    su.uPhase.value = st.phase
    su.uCharge.value = st.charge
    su.uColor.value.copy(st.color)
    su.uRainbow.value = st.rainbow
    su.uPx.value = 36 * state.viewport.dpr * (state.size.height / 460)
    if (orb.current) orb.current.scale.setScalar(0.4 + st.charge * (0.9 + Math.sin(t * 9) * 0.08) * (1 + (boost - 1) * 0.5))

    const age = t - st.shock
    const shockLive = age < 1.1
    // 衝撃波リングは常に描画対象のまま(加算合成なので黒=見えない)。初めて出る瞬間のシェーダコンパイルを避ける
    if (shock.current) {
      shock.current.scale.setScalar(shockLive ? 0.4 + age * 5 : 0.4)
      if (shockLive) r.mat.shock.color.copy(st.color).multiplyScalar(3 * (1 - age / 1.1) ** 2)
      else r.mat.shock.color.setScalar(0)
    }
    const pulse = shockLive ? (1 - age / 1.1) ** 2 : 0

    // カメラ: 待機は俯瞰、溜め中は押し込み、結果表示では引いてカードの背景に
    const fit = Math.max(1, 1.3 / (state.size.width / state.size.height))
    const [cx, cy, cz] = charging ? [0, 1.9, 4.5] : phase === 'reveal' ? [0, 4.6, 7.4] : [0, 3.1, 6.2]
    const shakeAmt = level === 'rainbow' && charging ? pulse * 0.25 : 0
    st.v.set(cx + Math.sin(t * 0.35) * 0.35 + (Math.random() - 0.5) * shakeAmt, cy * fit + (Math.random() - 0.5) * shakeAmt, cz * fit)
    state.camera.position.lerp(st.v, ease(charging ? 0.9 : 2.2))
    st.look.lerp(st.v.set(0, charging ? 1.1 : phase === 'reveal' ? 1.6 : 0.35, 0), ease(2))
    state.camera.lookAt(st.look)

    const bloomT = charging ? (level === 'rainbow' ? 1.9 : level === 'gold' ? 1.5 : 1.2) : phase === 'reveal' ? 0.9 : 0.8
    st.bloom += (bloomT - st.bloom) * ease(3)
    if (bloom.current) bloom.current.intensity = st.bloom + pulse * 1.2
    const caAmt = st.rainbow * (charging ? 0.0022 : 0.0008) + pulse * (level === 'rainbow' ? 0.012 : 0.004)
    if (ca.current) ca.current.offset.set(caAmt, caAmt * 0.6)
  })

  return (
    <>
      <AutoFit />
      <color attach="background" args={['#04061a']} />
      <Stars radius={40} depth={30} count={1000} factor={3} saturation={0.3} fade speed={reduced ? 0 : 0.5} />
      <Sparkles count={60} scale={[8, 3.5, 8]} position={[0, 1.4, 0]} size={2.4} speed={reduced ? 0 : 0.35} opacity={0.6} color="#bcd0ff" />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} material={r.mat.floor}>
        <planeGeometry args={[11, 11]} />
      </mesh>
      <mesh ref={outer} rotation-x={-Math.PI / 2} material={r.mat.outer}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <mesh ref={hex} rotation-x={-Math.PI / 2} position-y={0.01} material={r.mat.hex}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <mesh ref={inner} rotation-x={-Math.PI / 2} position-y={0.02} material={r.mat.inner}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <mesh ref={halo} rotation-x={-Math.PI / 2} material={r.mat.halo}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <group ref={gyro}>
        {[1.25, 1.5].map((rad) => (
          <mesh key={rad} material={r.mat.gyro}>
            <torusGeometry args={[rad, 0.012, 6, 160]} />
          </mesh>
        ))}
      </group>
      <mesh position-y={3.5} material={r.mat.pillar}>
        <cylinderGeometry args={[0.32, 0.7, 7, 48, 1, true]} />
      </mesh>
      <mesh position-y={3.5} material={r.mat.pillar}>
        <cylinderGeometry args={[0.06, 0.14, 7, 24, 1, true]} />
      </mesh>
      <points geometry={r.swirlGeo} material={r.mat.swirl} frustumCulled={false} />
      <Billboard position={[0, 1.1, 0]}>
        <mesh ref={orb} material={r.mat.orb}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </Billboard>
      <mesh ref={shock} rotation-x={-Math.PI / 2} position-y={0.05} material={r.mat.shock}>
        <ringGeometry args={[0.92, 1, 128]} />
      </mesh>
      <EffectComposer multisampling={0}>
        <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.3} luminanceSmoothing={0.3} intensity={0.9} radius={0.8} />
        <ChromaticAberration ref={ca} offset={caOffset} radialModulation={false} modulationOffset={0} />
        <Vignette offset={0.3} darkness={0.75} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={reduced ? 0 : 0.12} />
      </EffectComposer>
    </>
  )
}

/* ───────── 本体 ───────── */

const CSS = `
@keyframes gs-spin { to { transform: rotate(360deg) } }
@keyframes gs-hue { to { filter: hue-rotate(360deg) } }
@keyframes gs-sheen { from { transform: translateX(-120%) skewX(-20deg) } to { transform: translateX(260%) skewX(-20deg) } }
`

type FireFn = ReturnType<typeof confetti.create>

export function GachaSummon() {
  const reduced = !!useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [level, setLevel] = useState<Level | null>(null)
  const [pulls, setPulls] = useState<Pull[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [charging, setCharging] = useState<Set<number>>(new Set())
  const [gems, setGems] = useState(START_GEMS)
  const [forceTop, setForceTop] = useState(false)
  const [lastCount, setLastCount] = useState<1 | 10>(10)
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1))

  const timers = useRef<number[]>([])
  const cardEls = useRef<(HTMLButtonElement | null)[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const fireRef = useRef<FireFn | null>(null)
  const opened = useRef(new Set<number>())

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => {
    if (!document.fonts?.load) return
    for (const w of [400, 700, 900]) document.fonts.load(`${w} 16px "Noto Sans JP"`, WARM_TEXT).catch(() => {})
  }, [])

  useEffect(() => {
    const fire = confetti.create(canvasRef.current!, { resize: true, useWorker: false, disableForReducedMotion: true })
    fireRef.current = fire
    return () => {
      timers.current.forEach(clearTimeout)
      fire.reset()
      fireRef.current = null
    }
  }, [])

  const flash = (peak = 0.95, duration = 0.55) => {
    if (flashRef.current) animate(flashRef.current, { opacity: [0, peak, 0] }, { duration, times: [0, 0.25, 1] })
  }
  const shake = () => {
    for (const el of [stageRef.current, sceneRef.current]) if (el) animate(el, { x: [0, -10, 9, -7, 6, -3, 0], y: [0, 4, -4, 3, -2, 0, 0] }, { duration: 0.5 })
  }
  const burstAt = (i: number) => {
    const fire = fireRef.current
    const el = cardEls.current[i]
    const root = rootRef.current
    if (!fire || !el || !root) return
    const b = el.getBoundingClientRect()
    const r = root.getBoundingClientRect()
    const origin = { x: (b.left + b.width / 2 - r.left) / r.width, y: (b.top + b.height / 2 - r.top) / r.height }
    const colors = ['#ff5e9c', '#ffd36e', '#7dffb2', '#5ec8ff', '#b98bff', '#ffffff']
    fire({ particleCount: 90, spread: 80, startVelocity: 34, origin, colors, scalar: 0.9, ticks: 160, shapes: ['star', 'circle'] })
    window.setTimeout(() => fire({ particleCount: 50, spread: 140, startVelocity: 22, origin, colors, scalar: 0.7, ticks: 140 }), 140)
  }

  const reveal = (list: Pull[], allOpen: boolean) => {
    setLevel(null)
    setCharging(new Set())
    setPhase('reveal')
    opened.current = new Set(allOpen ? list.map((_, i) => i) : [])
    setFlipped(list.map(() => allOpen))
  }

  const pull = (count: 1 | 10) => {
    if (phase === 'charging' || gems < COST[count]) return
    clearTimers()
    const list = roll(count, forceTop)
    const best = Math.max(...list.map((p) => p.rarity)) as Rarity
    cardEls.current = []
    setGems((g) => g - COST[count])
    setLastCount(count)
    setPulls(list)
    if (reduced) {
      reveal(list, true)
      return
    }
    setPhase('charging')
    setLevel('blue')
    if (best >= 4)
      later(() => {
        setLevel('gold')
        flash(0.35, 0.35)
      }, 1000)
    if (best === 5)
      later(() => {
        setLevel('rainbow')
        flash(0.8, 0.45)
        shake()
      }, 1850)
    const end = best === 5 ? 2900 : best === 4 ? 2100 : 1500
    later(() => flash(1, 0.7), end - 180)
    later(() => reveal(list, false), end)
  }

  const flipOne = (i: number, list = pulls) => {
    if (opened.current.has(i)) return
    opened.current.add(i)
    setFlipped((f) => (f[i] ? f : f.map((v, j) => (j === i ? true : v))))
    if (list[i]?.rarity === 5) later(() => burstAt(i), reduced ? 0 : 300)
  }

  /** ★5 はめくる直前に少し「ため」を入れる */
  const openCard = (i: number) => {
    if (opened.current.has(i)) return
    if (pulls[i].rarity === 5 && !reduced) {
      setCharging((s) => new Set(s).add(i))
      later(() => {
        setCharging((s) => {
          const n = new Set(s)
          n.delete(i)
          return n
        })
        flipOne(i)
      }, 460)
    } else flipOne(i)
  }

  const tapCard = (i: number) => {
    if (phase !== 'reveal' || flipped[i] || charging.has(i)) return
    openCard(i)
  }

  /** ★5 を最後に回して順番にめくる */
  const flipAll = () => {
    const rest = pulls.map((p, i) => ({ p, i })).filter(({ i }) => !flipped[i] && !charging.has(i))
    rest.sort((a, b) => (a.p.rarity === 5 ? 1 : 0) - (b.p.rarity === 5 ? 1 : 0))
    if (reduced) rest.forEach(({ i }) => flipOne(i))
    else rest.forEach(({ i }, k) => later(() => openCard(i), k * 110 + (rest[k].p.rarity === 5 ? 250 : 0)))
  }

  const skip = () => {
    clearTimers()
    const hadTop = pulls.some((p) => p.rarity === 5)
    reveal(pulls, true)
    if (hadTop && !reduced) later(() => pulls.forEach((p, i) => p.rarity === 5 && burstAt(i)), 250)
  }

  const close = () => {
    clearTimers()
    setPhase('idle')
    setPulls([])
    setFlipped([])
    setCharging(new Set())
  }

  const allOpen = flipped.length > 0 && flipped.every(Boolean)
  const best = pulls.length ? (Math.max(...pulls.map((p) => p.rarity)) as Rarity) : 3
  const counts = ([5, 4, 3] as Rarity[]).map((r) => [r, pulls.filter((p) => p.rarity === r).length] as const)
  const ten = pulls.length > 1

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#04061a] font-['Noto_Sans_JP',sans-serif] text-white select-none"
    >
      <style>{CSS}</style>

      {/* WebGL の召喚ステージ(DOM の UI はこの上に重ねる) */}
      <div ref={sceneRef} aria-hidden className="absolute inset-0 z-0 [&_canvas]:!h-full [&_canvas]:!w-full">
        <Canvas
          dpr={dpr}
          frameloop={reduced ? 'demand' : 'always'}
          camera={{ position: [0, 3.1, 6.2], fov: 42 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          {/* 描画が間に合わない環境では解像度を自動で下げる */}
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))} />
          <SummonStage phase={phase} level={level} best={best} reduced={reduced} />
        </Canvas>
      </div>

      {/* ヘッダー */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3 pt-2.5 @min-[40rem]:px-5 @min-[40rem]:pt-3">
        <div className="min-w-0">
          <p className="truncate font-['Playfair_Display'] text-[11px] tracking-[.3em] text-[#e8c770] italic">Celestial Summon</p>
          <h2 className="truncate text-sm font-black tracking-wider @min-[40rem]:text-base">星詠みの召喚</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden rounded-full border border-white/15 bg-[#0a0d2a]/80 px-2 py-0.5 text-[10px] text-white/70 @min-[40rem]:inline">
            ★5 {Math.round(RATE[5] * 100)}% / ★4 {Math.round(RATE[4] * 100)}%
          </span>
          <span className="flex items-center gap-1 rounded-full border border-[#e8c770]/40 bg-black/65 py-0.5 pr-1 pl-2 text-xs font-bold tabular-nums">
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M6 0l4 4-4 8-4-8Z" fill="#8fd8ff" />
              <path d="M6 0l4 4H2Z" fill="#d6f2ff" />
            </svg>
            <span aria-label={`星晶石 ${gems}`}>{gems.toLocaleString('ja-JP')}</span>
            <button
              type="button"
              onClick={() => setGems(START_GEMS)}
              aria-label="星晶石を補充"
              className="grid size-4 place-items-center rounded-full bg-[#e8c770] text-[11px] leading-none font-black text-[#1a1306] hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              +
            </button>
          </span>
        </div>
      </header>

      {/* ステージ */}
      <div ref={stageRef} className="relative z-10 min-h-0 flex-1 [container-type:size]">
        {phase !== 'reveal' && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phase === 'charging' ? (level ?? 'none') : 'idle'}
                  className={`rounded-full px-4 py-1 text-xs font-bold tracking-widest @min-[40rem]:text-sm ${level === 'rainbow' ? '[animation:gs-hue_1.1s_linear_infinite]' : ''}`}
                  style={{
                    color: phase === 'charging' && level ? LEVEL_COLOR[level] : '#cfd7ff',
                    background: 'rgba(5,6,20,.72)',
                    textShadow: phase === 'charging' && level ? `0 0 10px ${LEVEL_COLOR[level]}` : undefined,
                  }}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  {phase === 'charging' && level ? LEVEL_TEXT[level] : '魔法陣に星の力が満ちている'}
                </motion.p>
              </AnimatePresence>
            </div>
            {phase === 'idle' && (
              <div className="absolute top-[8%] left-3 -rotate-3 @min-[40rem]:left-5">
                <span className="block w-fit bg-gradient-to-r from-[#ff5e9c] via-[#ffd36e] to-[#5ec8ff] px-2 text-[10px] font-black tracking-widest text-[#14102a]">PICK UP</span>
                <span className="mt-0.5 block text-xs font-black text-white [text-shadow:0_0_8px_#ff8ee0]">★5 星詠みの魔女 アステル</span>
              </div>
            )}
          </>
        )}

        {phase === 'reveal' && (
          <div className="absolute inset-0 grid place-items-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 50% 50%, ${R_STYLE[best].glow.replace(/[\d.]+\)$/, '.28)')}, transparent 65%)` }}
            />
            <div
              className={`relative grid ${ten ? 'grid-cols-5 gap-[10px]' : 'grid-cols-1'}`}
              style={{ width: ten ? 'min(calc(100% - 24px), calc((50cqh - 16px) * 3.333 + 40px))' : 'min(42%, calc((100cqh - 36px) * .6667), 320px)' }}
            >
              {pulls.map((p, i) => (
                <Card
                  key={p.id}
                  pull={p}
                  index={i}
                  flipped={!!flipped[i]}
                  charging={charging.has(i)}
                  reduced={reduced}
                  onFlip={() => tapCard(i)}
                  cardRef={(el) => {
                    cardEls.current[i] = el
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'charging' && (
          <button
            type="button"
            onClick={skip}
            className="absolute top-1 right-3 z-30 rounded-full border border-white/25 bg-black/50 px-3 py-1 text-[11px] font-bold tracking-wider text-white/85 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none @min-[40rem]:right-5"
          >
            スキップ ≫
          </button>
        )}
      </div>

      {/* フッター */}
      <footer className="relative z-20 flex min-h-[3.4rem] flex-wrap items-center justify-center gap-2 px-3 pt-1 pb-[calc(var(--solo-footer-clearance,0px)_+_0.7rem)]">
        {phase === 'idle' && (
          <>
            <button
              type="button"
              aria-pressed={forceTop}
              onClick={() => setForceTop((v) => !v)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                forceTop ? 'border-[#ff8ee0] bg-[#ff8ee0]/20 text-[#ffd0f1]' : 'border-white/20 text-white/60 hover:text-white'
              }`}
            >
              {forceTop ? '✓ ' : ''}★5確定(デモ用)
            </button>
            {([1, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={gems < COST[n]}
                onClick={() => pull(n)}
                className={`group relative overflow-hidden rounded-xl border px-4 py-1.5 text-left shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 @min-[40rem]:px-6 ${
                  n === 10
                    ? 'border-[#ffe9a8] bg-gradient-to-b from-[#ffd76a] to-[#c98a12] text-[#2a1800] shadow-[#c98a12]/40'
                    : 'border-[#b9e6ff] bg-gradient-to-b from-[#6fc8ff] to-[#2a6fcf] text-[#04162e] shadow-[#2a6fcf]/40'
                }`}
              >
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/40 transition-transform duration-500 group-hover:translate-x-[420%]" />
                <span className="block text-sm leading-tight font-black">{n === 1 ? '単発召喚' : '10連召喚'}</span>
                <span className="block text-[10px] font-bold opacity-80">星晶石 ×{COST[n].toLocaleString('ja-JP')}</span>
              </button>
            ))}
          </>
        )}
        {phase === 'charging' && <p className="text-[11px] tracking-[.3em] text-white/50">SUMMONING…</p>}
        {phase === 'reveal' && !allOpen && (
          <>
            <p className="text-[11px] text-white/60">カードをタップしてめくる</p>
            <button
              type="button"
              onClick={flipAll}
              className="rounded-xl border border-white/30 bg-[#141a44]/85 px-4 py-1.5 text-xs font-black tracking-wider hover:bg-[#232b66] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              すべてめくる ≫
            </button>
          </>
        )}
        {phase === 'reveal' && allOpen && (
          <motion.div className="flex flex-wrap items-center justify-center gap-2" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="flex gap-1.5 text-[11px] font-bold" aria-label="結果">
              {counts.map(([r, n]) => (
                <span key={r} className="rounded-full bg-black/40 px-2 py-0.5" style={{ color: R_STYLE[r].color }}>
                  ★{r} ×{n}
                </span>
              ))}
            </span>
            <button
              type="button"
              disabled={gems < COST[lastCount]}
              onClick={() => pull(lastCount)}
              className="rounded-xl border border-[#ffe9a8] bg-gradient-to-b from-[#ffd76a] to-[#c98a12] px-4 py-1.5 text-xs font-black text-[#2a1800] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-40"
            >
              もう一度 {lastCount === 10 ? '10連' : '単発'}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              とじる
            </button>
          </motion.div>
        )}
      </footer>

      <div ref={flashRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-white opacity-0" />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-50 size-full" />
      <p className="sr-only" aria-live="polite">
        {phase === 'charging' ? '召喚中' : phase === 'reveal' && allOpen ? `結果 ${counts.map(([r, n]) => `★${r} ${n}体`).join('、')}` : ''}
      </p>
    </div>
  )
}
