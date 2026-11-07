import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'

/**
 * スタイリッシュJRPG風の「総攻撃」フィニッシュ演出。赤・黒・白の3色だけで組む。
 * - 演出は gsap の 1 本のタイムラインで秒単位に詰めて並べる(包囲 → 突撃 → 乱闘の煙 → とどめの一枚絵 → リザルト → 待機に戻る)。
 *   スローは timeScale を下げるだけ。スキップはラベルへ seek するので、途中の状態がすべて正しく確定する
 * - 仲間は「関節の座標」を並べたポーズデータから太い線の手足を描く 2D SVG のオリジナルシルエット。待機・跳躍・決めポーズを差し替え、
 *   白い輪郭と赤いずらし影は feMorphology の膨張フィルタでまとめて付ける。突撃では潰れ→伸びのスメア、赤い残像、集中線、カメラの寄りと揺れ
 * - 乱闘の煙は素の WebGL + GLSL。円の和集合をドメインワープした fbm で歪ませた漫画的な土煙で、白いフチ・赤い外周・網点・飛び散る小さな煙玉を描く。
 *   煙の上には拳や刃が突き出すシルエット、斬撃線、衝撃の星、切り抜き文字の擬音(ドカッ / バキッ / ズドン)を時間差で出す
 * - とどめは白黒反転のインパクトコマを挟んで全画面の一枚絵へハードカット。斜めの帯・ハーフトーン・放射線・仲間ごとの紋章・筆の太線と切り抜き文字。
 *   敵は canvas 2D のインク飛沫になって弾ける(消さずに描き重ねる粒子の軌跡で、尾を引くしぶきにする)
 * - 総ダメージの数字は DOM の textContent を直接更新して駆け上がり、最後に「撃破」の判子が落ちる。毎フレームの React 再描画はしない
 * - Enter / Space で開始、Esc でスキップ(デモ内にフォーカスがあるときのみ)。useReducedMotion 時は一枚絵とリザルトを静止画のフェードで見せる
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'
const INK = '#0e0d12'
const INK2 = '#2b2731'
const SLOW = 0.3

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

/* ───────────── 切り抜き文字(gsap で 1 文字ずつ動かすので静的に描く) ───────────── */

const CUT_FONTS: CSSProperties[] = [
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Playfair Display', 'Yu Mincho', 'Hiragino Mincho ProN', serif", fontWeight: 900, fontStyle: 'italic' },
  { fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif", fontWeight: 700 },
  { fontFamily: "'Orbitron', 'Noto Sans JP', sans-serif", fontWeight: 900 },
]
const SCHEMES: CSSProperties[] = [
  { background: WHITE, color: BLACK },
  { background: BLACK, color: WHITE },
  { background: RED, color: WHITE },
  { background: WHITE, color: RED },
  { background: BLACK, color: RED },
]

function Cut({ text, attr, shadow = BLACK, seed = 0 }: { text: string; attr?: string; shadow?: string; seed?: number }) {
  const letters = useMemo(() => {
    const r = mulberry32(hash(text) + seed)
    let prev = -1
    return [...text].map((ch) => {
      let s = Math.floor(r() * SCHEMES.length)
      if (s === prev) s = (s + 1 + Math.floor(r() * (SCHEMES.length - 1))) % SCHEMES.length
      prev = s
      const j = () => +(r() * 9).toFixed(1)
      return {
        ch,
        style: { ...SCHEMES[s], ...CUT_FONTS[Math.floor(r() * CUT_FONTS.length)] },
        rot: (r() - 0.5) * 24,
        scale: 0.86 + r() * 0.3,
        dy: ((r() - 0.5) * 0.2).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
      }
    })
  }, [text, seed])
  return (
    <span aria-hidden className="inline-flex items-center whitespace-nowrap" style={{ filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) => (
        <span
          key={i}
          data-a={attr}
          className="inline-block leading-none"
          style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.14em 0.13em', marginRight: '-0.03em', clipPath: l.clip, rotate: `${l.rot}deg`, translate: `0 ${l.dy}em` }}
        >
          {l.ch}
        </span>
      ))}
    </span>
  )
}

/* ───────────── 仲間(関節座標から描くシルエット) ───────────── */

type P = readonly [number, number]
type Pose = {
  head: P
  tilt: number
  neck: P
  sh: readonly [P, P]
  hip: readonly [P, P]
  armB: readonly [P, P]
  armF: readonly [P, P]
  legB: readonly [P, P]
  legF: readonly [P, P]
  /** 髪・マフラー・鉢巻がなびく向き(0 で真後ろ) */
  wind: number
  /** コートの裾の先端(後ろ腰からの相対) */
  coat: P
  /** 前の手 / 後ろの手の武器の角度 */
  wF?: number
  wB?: number
}
const LEAP: Pose = {
  head: [136, 58],
  tilt: 28,
  neck: [125, 73],
  sh: [[110, 80], [131, 88]],
  hip: [[82, 128], [95, 136]],
  armB: [[88, 102], [62, 112]],
  armF: [[154, 76], [172, 52]],
  legB: [[62, 166], [30, 178]],
  legF: [[124, 160], [100, 192]],
  wind: 4,
  coat: [-44, 26],
}

type Motif = 'moon' | 'flame' | 'cross' | 'star'
type Crew = { name: string; role: string; motif: Motif; word: string; en: string; idle: Pose; leap: Pose; finish: Pose }

const CREW: Crew[] = [
  {
    name: 'カグラ',
    role: '刀',
    motif: 'moon',
    word: '一刀両断',
    en: 'CRESCENT EDGE',
    idle: {
      head: [104, 36], tilt: 6, neck: [101, 54],
      sh: [[91, 62], [111, 64]], hip: [[93, 128], [107, 129]],
      armB: [[84, 94], [96, 120]], armF: [[132, 84], [152, 100]],
      legB: [[86, 186], [70, 246]], legF: [[124, 184], [138, 246]],
      wind: 12, coat: [-30, 66], wF: 26,
    },
    leap: { ...LEAP, wF: -58 },
    finish: {
      head: [128, 62], tilt: 16, neck: [119, 80],
      sh: [[104, 86], [129, 92]], hip: [[96, 150], [114, 152]],
      armB: [[76, 112], [50, 126]], armF: [[152, 108], [180, 112]],
      legB: [[68, 204], [20, 250]], legF: [[160, 186], [178, 250]],
      wind: 20, coat: [-60, 40], wF: -6,
    },
  },
  {
    name: 'ジン',
    role: '拳',
    motif: 'flame',
    word: '鉄拳粉砕',
    en: 'IRON BLAZE',
    idle: {
      head: [106, 44], tilt: 12, neck: [102, 61],
      sh: [[90, 69], [114, 71]], hip: [[92, 134], [108, 134]],
      armB: [[100, 106], [122, 88]], armF: [[138, 98], [150, 72]],
      legB: [[80, 190], [60, 246]], legF: [[132, 186], [146, 246]],
      wind: 8, coat: [0, 0],
    },
    leap: LEAP,
    finish: {
      head: [110, 66], tilt: -18, neck: [106, 84],
      sh: [[94, 92], [118, 88]], hip: [[94, 158], [110, 158]],
      armB: [[76, 124], [58, 100]], armF: [[140, 56], [142, 14]],
      legB: [[98, 210], [88, 262]], legF: [[138, 176], [128, 218]],
      wind: -70, coat: [0, 0],
    },
  },
  {
    name: 'ルカ',
    role: '双銃',
    motif: 'cross',
    word: '全弾命中',
    en: 'FULL BURST',
    idle: {
      head: [100, 32], tilt: -2, neck: [100, 50],
      sh: [[91, 59], [109, 58]], hip: [[94, 128], [106, 128]],
      armB: [[86, 94], [86, 124]], armF: [[132, 60], [158, 58]],
      legB: [[90, 188], [80, 246]], legF: [[112, 186], [118, 246]],
      wind: 6, coat: [-22, 76], wF: -2, wB: 92,
    },
    leap: { ...LEAP, wF: -24, wB: 150 },
    finish: {
      head: [98, 40], tilt: -8, neck: [100, 58],
      sh: [[88, 66], [112, 68]], hip: [[94, 138], [108, 138]],
      armB: [[80, 46], [90, 16]], armF: [[140, 72], [170, 66]],
      legB: [[84, 196], [62, 254]], legF: [[128, 194], [150, 254]],
      wind: 28, coat: [-52, 62], wF: -6, wB: -84,
    },
  },
  {
    name: 'ミオ',
    role: '大槌',
    motif: 'star',
    word: '天地鳴動',
    en: 'STAR CRASH',
    idle: {
      head: [100, 42], tilt: -8, neck: [100, 60],
      sh: [[90, 68], [110, 68]], hip: [[93, 134], [107, 134]],
      armB: [[80, 98], [90, 122]], armF: [[126, 92], [116, 66]],
      legB: [[90, 190], [78, 246]], legF: [[116, 190], [126, 246]],
      wind: 10, coat: [0, 0], wF: -142,
    },
    leap: { ...LEAP, wF: -118 },
    finish: {
      head: [126, 60], tilt: 14, neck: [118, 77],
      sh: [[102, 85], [124, 90]], hip: [[90, 150], [104, 154]],
      armB: [[126, 108], [152, 94]], armF: [[142, 100], [166, 84]],
      legB: [[68, 204], [28, 248]], legF: [[150, 190], [170, 250]],
      wind: 12, coat: [0, 0], wF: -36,
    },
  },
]

const HAIR = [
  'M-14 2C-17 -14 -6 -21 5 -18C15 -16 18 -6 14 4L10 -4L8 4L3 -6L0 2L-4 -7L-8 3Z',
  'M-13 -1L-20 -16L-11 -13L-13 -29L-3 -17L2 -32L8 -17L18 -26L14 -10L17 -2L10 -6L4 -2L-2 -8L-6 -2Z',
  'M-15 8C-18 -12 -7 -21 5 -19C16 -17 18 -6 15 9L10 -3C6 1 0 -1 -5 -6L-9 11Z',
  'M-14 4C-16 -14 -5 -20 5 -18C15 -16 17 -5 13 6L10 -4L5 0L-1 -9L-6 2Z',
]
const STAR_D = 'M12 .8l3.2 7.4 8 .7-6.1 5.3 1.8 7.9L12 18l-6.9 4.1 1.8-7.9L.8 8.9l8-.7z'

/** ポーズの関節座標から、太い線の手足・胴・頭・髪・武器を重ねてシルエットを描く。flat を渡すと単色(残像・インパクトコマ用) */
function Figure({ who, pose, flat }: { who: number; pose: Pose; flat?: string }) {
  const ink = flat ?? INK
  const ink2 = flat ?? INK2
  const red = flat ?? RED
  const white = flat ?? WHITE
  const { head, neck, sh, hip, armB, armF, legB, legF } = pose
  const [sb, sf] = sh
  const [hb, hf] = hip
  /** 太もも・ひざ・足首 / 肩・ひじ・手首 の太さ(仲間ごとに体格を変える) */
  const LW = ([[17, 12, 9], [21, 15, 11.5], [16, 11, 8.5], [15, 10.5, 8]] as const)[who]
  const AW = ([[12, 9, 7], [15.5, 12, 10], [11.5, 8.5, 7], [10.5, 8, 6.5]] as const)[who]
  const at = (p: P, rot = 0) => `translate(${p[0]} ${p[1]}) rotate(${rot})`
  const f1 = (n: number) => n.toFixed(1)
  /** 太さが変わる手足の 1 区間(台形)+ 関節の丸 */
  const seg = (a: P, b: P, wa: number, wb: number) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / L
    const ny = (b[0] - a[0]) / L
    const q = (c: P, w: number, s: number) => `${f1(c[0] + (nx * w * s) / 2)} ${f1(c[1] + (ny * w * s) / 2)}`
    return `M${q(a, wa, 1)}L${q(b, wb, 1)}L${q(b, wb, -1)}L${q(a, wa, -1)}Z`
  }
  const dot = (c: P, w: number) => `M${f1(c[0] - w / 2)} ${f1(c[1])}a${f1(w / 2)} ${f1(w / 2)} 0 1 0 ${f1(w)} 0a${f1(w / 2)} ${f1(w / 2)} 0 1 0 ${f1(-w)} 0Z`
  const limb = (a: P, b: P, c: P, w: readonly [number, number, number], col: string) => (
    <path d={seg(a, b, w[0], w[1]) + seg(b, c, w[1], w[2]) + dot(a, w[0]) + dot(b, w[1])} fill={col} />
  )
  const boot = (f: P, col: string) => (
    <path d={`M${f[0] - 6} ${f[1] - 9}L${f[0] + 5} ${f[1] - 10}L${f[0] + 18} ${f[1] - 1}L${f[0] + 18} ${f[1] + 5}L${f[0] - 7} ${f[1] + 5}Z`} fill={col} />
  )
  const hand = (p: P, col: string, back: boolean) =>
    who === 1 ? (
      <rect x={p[0] - 9.5} y={p[1] - 8.5} width="19" height="17" rx="5" fill={back ? (flat ?? '#8f0c12') : red} stroke={ink} strokeWidth="2" />
    ) : (
      <circle cx={p[0]} cy={p[1]} r={AW[2] * 0.82} fill={col} />
    )
  const weapon = (p: P, ang: number | undefined) => {
    if (ang === undefined) return null
    if (who === 0)
      return (
        <g transform={at(p, ang)}>
          <path d="M-16 -2.6H4V2.6H-16Z" fill={ink} />
          <path d="M-13 -2.6l2 5.2M-8 -2.6l2 5.2M-3 -2.6l2 5.2" stroke={red} strokeWidth="1.6" />
          <path d="M3 -7H8V7H3Z" fill={ink} />
          <path d="M8 -2.6L96 -4Q106 -3 112 0.4L8 2.6Z" fill={white} stroke={ink} strokeWidth="1.2" />
        </g>
      )
    if (who === 2)
      return (
        <g transform={at(p, ang)}>
          <path d="M-4 -8H26V-1H9L6 9H-3L0 -1H-4Z" fill={ink} stroke={white} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M3 -5H24" stroke={red} strokeWidth="1.6" />
        </g>
      )
    if (who === 3)
      return (
        <g transform={at(p, ang)}>
          <path d="M-14 -3H72V3H-14Z" fill={ink} />
          <path d="M64 -21H98V21H64Z" fill={ink} stroke={white} strokeWidth="2.2" />
          <path d="M64 -21H69V21H64ZM93 -21H98V21H93Z" fill={red} />
          <path d={STAR_D} transform="translate(73 -8) scale(0.68)" fill={white} />
          <path d="M-14 -4.5H-4V4.5H-14Z" fill={red} />
        </g>
      )
    return null
  }
  const coatLen = who === 2 ? 74 : 56
  const tip: P = [hb[0] + pose.coat[0], hb[1] + pose.coat[1]]
  const coatD = `M${hb[0] - 6} ${hb[1] - 16}L${hf[0] + 6} ${hf[1] - 14}L${hf[0] + 10} ${hf[1] + coatLen}L${(hf[0] + tip[0]) / 2 + 4} ${Math.max(hf[1] + coatLen, tip[1]) - 8}L${tip[0]} ${tip[1]}L${tip[0] + 10} ${tip[1] - 22}Z`
  const shMid: P = [(sb[0] + sf[0]) / 2, (sb[1] + sf[1]) / 2 + 2]
  const lp = (a: P, b: P, t: number): P => [+f1(a[0] + (b[0] - a[0]) * t), +f1(a[1] + (b[1] - a[1]) * t)]
  const chest = lp([sf[0] + 7, sf[1]], [hf[0] + 7, hf[1]], 0.25)
  const waF = lp([sf[0] + 1, sf[1]], [hf[0] + 1, hf[1]], 0.62)
  const waB = lp([sb[0] + 2, sb[1]], [hb[0] + 2, hb[1]], 0.6)

  return (
    <g>
      {/* なびくもの(後ろ) */}
      {who === 0 && (
        <>
          <path transform={at(head, pose.wind)} d="M-6 -12C-22 -18 -38 -8 -58 -20C-48 -6 -38 -2 -54 8C-34 10 -18 4 -4 2Z" fill={ink} />
          <path transform={at(neck, pose.wind)} d="M2 -2C-18 -10 -38 4 -64 -8L-56 1 -70 8C-44 16 -20 8 2 6Z" fill={red} />
        </>
      )}
      {who === 1 && (
        <g transform={at(head, pose.wind)} fill={red}>
          <path d="M-11 -6C-26 -12 -38 -2 -56 -10L-50 -2C-36 4 -24 -2 -11 0Z" />
          <path d="M-11 -3C-24 2 -32 12 -50 10L-44 16C-30 18 -20 8 -11 2Z" />
        </g>
      )}
      {who === 3 && (
        <g transform={at(head, pose.wind)} fill={ink}>
          <path d="M-4 -15C-20 -28 -36 -12 -56 -26C-46 -8 -32 -2 -18 -6C-12 -8 -8 -10 -4 -10Z" />
          <path d="M-10 -8C-26 -8 -38 8 -56 2C-42 16 -26 14 -16 8Z" />
        </g>
      )}
      {(who === 0 || who === 2) && (
        <>
          <path d={coatD} fill={red} transform="translate(-3 3)" />
          <path d={coatD} fill={ink} />
        </>
      )}

      {/* 後ろの腕と脚 */}
      {weapon(armB[1], pose.wB)}
      {limb(hb, legB[0], legB[1], LW, ink2)}
      {boot(legB[1], ink2)}
      {limb(sb, armB[0], armB[1], AW, ink2)}
      {hand(armB[1], ink2, true)}

      {/* 胴: 肩幅 → くびれ → 腰。胸は進行方向へ少し張り出す */}
      <path
        d={`M${sb[0] - 6} ${sb[1] - 1}L${sf[0] + 6} ${sf[1] - 2}L${chest[0]} ${chest[1]}L${waF[0]} ${waF[1]}L${hf[0] + 5} ${hf[1] + 2}L${hb[0] - 5} ${hb[1] + 2}L${waB[0]} ${waB[1]}Z`}
        fill={ink}
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d={dot(sb, AW[0] + 3) + dot(sf, AW[0] + 4)} fill={ink} />
      {(who === 0 || who === 1) && <path d={`M${hb[0] - 4} ${hb[1] - 7}L${hf[0] + 5} ${hf[1] - 9}`} stroke={red} strokeWidth="5" />}
      {who === 2 && (
        <>
          <path d={`M${sf[0] + 2} ${sf[1] + 2}L${hb[0] - 2} ${hb[1] - 4}`} stroke={red} strokeWidth="3.4" />
          <path d={`M${neck[0] - 9} ${neck[1] - 4}L${shMid[0] - 13} ${shMid[1] + 2}L${shMid[0] + 12} ${shMid[1] + 1}L${neck[0] + 8} ${neck[1] - 6}Z`} fill={ink} />
        </>
      )}
      <path d={seg(neck, shMid, 8, 10)} fill={ink} />

      {/* 前の脚 */}
      {limb(hf, legF[0], legF[1], LW, ink)}
      {boot(legF[1], ink)}
      {who === 3 && (
        <>
          <path d={`M${hb[0] - 8} ${hb[1] - 8}L${hf[0] + 8} ${hf[1] - 8}L${hf[0] + 18} ${hf[1] + 26}L${hb[0] - 20} ${hb[1] + 28}Z`} fill={ink} />
          <path d={`M${hf[0] + 18} ${hf[1] + 26}L${hb[0] - 20} ${hb[1] + 28}`} stroke={red} strokeWidth="3.5" />
          <path d={`M${shMid[0] - 7} ${shMid[1] - 4}l7 4-7 4ZM${shMid[0] + 7} ${shMid[1] - 4}l-7 4 7 4Z`} fill={red} />
        </>
      )}

      {/* 頭 */}
      <g transform={at(head, pose.tilt)}>
        <ellipse rx="11.5" ry="13.5" fill={ink} />
        <path d="M-7 5Q0 18 9 13L11.5 2Z" fill={ink} />
        <path d="M10 -3L14.5 2L10.5 4Z" fill={ink} />
        <path d={HAIR[who]} fill={ink} />
        {who === 1 && <path d="M-13 -6L14 -9L14 -4L-13 -1Z" fill={red} />}
        {who === 2 ? <path d="M1 -5L16 -6L15 -1L1 0Z" fill={red} /> : <path d="M3 -2L13 -3L5 2Z" fill={red} />}
        {who === 3 && <path d={STAR_D} transform="translate(-12 -22) scale(0.42)" fill={white} />}
      </g>

      {/* 前の腕と武器 */}
      {limb(sf, armF[0], armF[1], AW, ink)}
      {weapon(armF[1], pose.wF)}
      {hand(armF[1], ink, false)}
    </g>
  )
}

const FIG_VIEW = '-30 -10 260 280'

/* ───────────── 敵(怯える影もどき) ───────────── */

const HORNS = ['M38 36 24 6 54 30ZM80 32 98 4 92 40Z', 'M52 30 60 -2 74 30Z', 'M30 44 10 22 46 32ZM88 34 112 16 96 48Z']

function Foe({ v = 0 }: { v?: number }) {
  return (
    <>
      <path d="M14 106C2 78 10 40 46 30C58 26 72 26 84 32C110 44 118 80 106 106Z" fill={INK} />
      <path d={HORNS[v]} fill={INK} />
      <ellipse cx="48" cy="66" rx="10" ry="12.5" fill={WHITE} />
      <ellipse cx="76" cy="64" rx="10" ry="12.5" fill={WHITE} />
      <circle cx="50" cy="60" r="3.6" fill={RED} />
      <circle cx="78" cy="58" r="3.6" fill={RED} />
      <path d="M22 76C14 52 30 30 56 30M100 74C108 52 92 30 66 30" stroke={INK2} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M46 90l5-4 5 4 5-4 5 4 5-4 5 4" stroke={WHITE} strokeWidth="3" fill="none" strokeLinejoin="round" />
    </>
  )
}

/* ───────────── 紋章・効果の形 ───────────── */

function MotifIcon({ m, className }: { m: Motif; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      {m === 'moon' && <path d="M15.5 1.5A10.5 10.5 0 1 0 22.5 18 8.5 8.5 0 0 1 15.5 1.5Z" />}
      {m === 'flame' && <path d="M12 1c2.4 4.4 7 6.6 7 12.2A7 7 0 0 1 5 13.2c0-3.3 2.2-4.6 2.2-7.8 2.3 1.2 3.4 3.4 3.4 5.6 1.2-3.4 1.4-6.6 1.4-10z" />}
      {m === 'cross' && (
        <>
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <path d="M10.7 0h2.6v8h-2.6zM10.7 16h2.6v8h-2.6zM0 10.7h8v2.6H0zM16 10.7h8v2.6h-8z" />
          <circle cx="12" cy="12" r="1.8" />
        </>
      )}
      {m === 'star' && <path d={STAR_D} />}
    </svg>
  )
}

const starPoints = (seed: number, n: number, rOut: number, rIn: number) => {
  const r = mulberry32(seed)
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 + (r() - 0.5) * 0.18
    const rad = i % 2 ? rIn * (0.8 + r() * 0.4) : rOut * (0.75 + r() * 0.35)
    return `${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`
  }).join(' ')
}
const IMPACT = starPoints(7, 11, 48, 20)
const IMPACT_IN = starPoints(8, 9, 26, 11)
const BURST = starPoints(21, 16, 50, 34)

/** 集中線: 外周から中心へ伸びる細いくさび */
const SPEED_LINES = (() => {
  const r = mulberry32(31)
  return Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 + (r() - 0.5) * 0.08
    const inner = 34 + r() * 30
    const w = 0.012 + r() * 0.03
    const p = (rad: number, da: number) => `${(Math.cos(a + da) * rad).toFixed(1)},${(Math.sin(a + da) * rad).toFixed(1)}`
    return { pts: `${p(190, -w)} ${p(190, w)} ${p(inner, 0)}`, red: r() < 0.22 }
  })
})()

/** 乱闘の煙から突き出す形(すべて +x 方向を向き、x=0 が煙の内側) */
const POP_SHAPES: ReactNode[] = [
  <>
    <path d="M0 15h34v10H0z" fill={INK} />
    <rect x="30" y="7" width="26" height="26" rx="7" fill={RED} stroke={INK} strokeWidth="2.5" />
  </>,
  <>
    <path d="M0 14h38v12H0z" fill={INK} />
    <path d="M34 4h12l12 30H34z" fill={INK} />
    <path d="M52 6l6 28" stroke={RED} strokeWidth="3" />
  </>,
  <>
    <path d="M0 18h14v5H0z" fill={INK} />
    <path d="M13 11h4v19h-4z" fill={INK} />
    <path d="M17 17.5L58 19 64 20.5 17 23z" fill={WHITE} stroke={INK} strokeWidth="1" />
  </>,
  <>
    <path d="M6 20a22 17 0 1 0 44 0 22 17 0 1 0-44 0" fill={INK} />
    <path d="M22 6 16-6 30 6ZM36 6l8-12 2 14Z" fill={INK} />
    <path d="M21 14l7 7m0-7-7 7M35 14l7 7m0-7-7 7" stroke={WHITE} strokeWidth="2.6" />
  </>,
  <>
    <path d="M0 17h40v6H0z" fill={INK} />
    <path d="M36 2h22v36H36z" fill={INK} />
    <path d="M43 2h7v36h-7z" fill={RED} />
  </>,
  <>
    <path d="M0 16h24v8H0z" fill={INK} />
    <path d="M20 10h26v7H32l-3 10h-8l2-10h-3z" fill={INK} stroke={WHITE} strokeWidth="1.2" />
    <path d="M50 13l10-6-4 8 8 1-8 4 5 7-9-4z" fill={RED} stroke={WHITE} strokeWidth="1" />
  </>,
  <>
    <path d="M0 15h34v10H0z" fill={INK} />
    <rect x="30" y="7" width="26" height="26" rx="7" fill={RED} stroke={INK} strokeWidth="2.5" />
    <path d="M58 6l6-4M60 20h6M58 34l6 4" stroke={WHITE} strokeWidth="2.5" />
  </>,
  <>
    <path d="M0 14h38v12H0z" fill={INK} />
    <path d="M34 4h12l12 30H34z" fill={INK} />
  </>,
]
const POP_ANGLES = [-150, 18, -38, 158, 72, -100, 116, -72]
const STAR_SPOTS = (() => {
  const r = mulberry32(44)
  return Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + r() * 0.6
    const d = 26 + r() * 20
    return { x: 50 + Math.cos(a) * d, y: 50 + Math.sin(a) * d, s: 18 + r() * 12 }
  })
})()
const SLASH_ROT = [-24, 18, -58, 36, -8, 62]
const FLASH_SPOTS = [
  { x: 36, y: 44, rot: -18, who: 0 },
  { x: 62, y: 50, rot: 22, who: 1 },
  { x: 46, y: 58, rot: -40, who: 3 },
]
const WORDS = [
  { text: 'ドカッ', x: -14, y: -2, rot: -14, size: 1 },
  { text: 'バキッ', x: 64, y: 6, rot: 11, size: 1 },
  { text: 'ガッ', x: 2, y: 66, rot: -6, size: 0.9 },
  { text: 'ズドン', x: 40, y: 60, rot: -9, size: 1.45 },
]

type Ev = readonly [t: number, kind: 'pop' | 'star' | 'slash' | 'flash' | 'word', idx: number, amp?: number]
const BRAWL: Ev[] = [
  [0.05, 'star', 0, 10], [0.1, 'word', 0], [0.14, 'pop', 0, 8], [0.2, 'slash', 0], [0.26, 'flash', 0], [0.3, 'pop', 1, 9], [0.36, 'star', 1, 10],
  [0.44, 'word', 1], [0.47, 'slash', 1], [0.52, 'pop', 2, 8], [0.6, 'star', 2, 10], [0.64, 'pop', 3, 9], [0.7, 'flash', 1],
  [0.78, 'word', 2], [0.8, 'slash', 2], [0.86, 'pop', 4, 8], [0.92, 'star', 3, 10], [0.98, 'pop', 5, 9], [1.04, 'slash', 3],
  [1.1, 'word', 3], [1.13, 'star', 4, 18], [1.2, 'pop', 6, 9], [1.27, 'flash', 2], [1.32, 'slash', 4], [1.36, 'slash', 5], [1.42, 'star', 5, 10],
  [1.5, 'pop', 7, 9], [1.56, 'star', 6, 12],
]

/* ───────────── 乱闘の煙(GLSL) ───────────── */

const CLOUD_VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
/** 円の和集合を fbm でドメインワープして漫画の土煙にする。内側は黒地に白い渦線と赤い火花、フチは白、外周は赤い線と網点、周りに煙玉が飛ぶ */
const CLOUD_FS = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform vec2 uC; uniform float uR; uniform float uT; uniform float uPulse; uniform float uDpr;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float puffs(vec2 p, float t) {
  float d = length(p) - 0.56;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float an = fi * 0.5712 + t * 0.45 + sin(t * 1.7 + fi) * 0.14;
    float rr = 0.5 + 0.08 * sin(t * 5.1 + fi * 2.3);
    float pr = 0.29 + 0.07 * sin(t * 6.3 + fi * 1.9) + 0.06 * hash(vec2(fi, 3.0));
    d = min(d, length(p - vec2(cos(an), sin(an)) * rr) - pr);
  }
  return d;
}
void main() {
  vec2 p = (gl_FragCoord.xy - uC) / uR;
  if (dot(p, p) > 4.4) { gl_FragColor = vec4(0.0); return; }
  float t = uT;
  vec2 w = vec2(fbm(p * 2.3 + t * 1.3), fbm(p * 2.3 - t * 1.1 + 5.2)) - 0.5;
  vec2 q = p * (1.0 - uPulse * 0.1) + w * 0.18;
  float d = puffs(q, t);
  for (int j = 0; j < 7; j++) {
    float fj = float(j);
    float k = t * 1.4 + fj * 0.37;
    float life = fract(k);
    float an = fj * 2.39996 + floor(k) * 1.3;
    d = min(d, length(q - vec2(cos(an), sin(an)) * (0.8 + life * 0.8)) - 0.17 * (1.0 - life));
  }
  float aa = 1.6 / uR;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  float rimW = 1.0 - smoothstep(-0.05 - aa, -0.05 + aa, d);
  float white = inside * (1.0 - rimW);
  float ring = (1.0 - inside) * (1.0 - smoothstep(0.045 - aa, 0.045 + aa, d));
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (8.0 * uDpr);
  float cell = length(fract(g) - 0.5);
  float fr = clamp(1.0 - (d - 0.05) / 0.32, 0.0, 1.0) * step(0.05, d);
  float dots = step(cell, fr * 0.52) * step(0.02, fr);
  float s = fbm(p * 1.6 + vec2(t * 1.6, -t * 1.2));
  float lines = (1.0 - smoothstep(0.02, 0.05, abs(fract(s * 6.0 + t * 0.8) - 0.5))) * step(0.45, noise(p * 2.5 + t * 2.0)) * rimW * step(d, -0.12);
  float flecks = step(0.7, fbm(p * 5.0 - t * 3.0)) * rimW;
  vec3 col = vec3(0.047, 0.043, 0.051);
  col = mix(col, vec3(0.89, 0.08, 0.118), flecks);
  col = mix(col, vec3(0.965, 0.945, 0.906), max(white, lines * 0.9));
  col = mix(col, vec3(0.89, 0.08, 0.118), max(ring, dots * (1.0 - inside)));
  float a = max(max(inside, ring), dots * 0.9);
  gl_FragColor = vec4(col * a, a);
}`

type CloudGL = { ctx: WebGLRenderingContext; canvas: HTMLCanvasElement; u: Record<'uRes' | 'uC' | 'uR' | 'uT' | 'uPulse' | 'uDpr', WebGLUniformLocation | null> }
type Drop = { x: number; y: number; vx: number; vy: number; r: number; c: string; on: boolean }

/* ───────────── スタイル ───────────── */

const CSS = `
@keyframes aof-spin { to { rotate: 360deg } }
@keyframes aof-tremble { 0%,100% { translate: 0 0 } 25% { translate: -1.5px .6px } 50% { translate: 1.3px -.6px } 75% { translate: -.6px 1px } }
@keyframes aof-breathe { 0%,100% { scale: 1 1 } 50% { scale: 1.012 .986 } }
@keyframes aof-pulse { 0%,100% { scale: 1 } 50% { scale: 1.055 } }
@keyframes aof-ring { from { scale: 1; opacity: .8 } to { scale: 1.25 1.7; opacity: 0 } }
@keyframes aof-bob { 0%,100% { translate: -50% 0 } 50% { translate: -50% -5px } }
@keyframes aof-drip { 0% { translate: 0 -3px; opacity: 0 } 25% { opacity: 1 } 100% { translate: 0 9px; opacity: 0 } }
@keyframes aof-flicker { 0%,64% { opacity: 1 } 65%,100% { opacity: .25 } }
.aof-cam { --sb: calc(var(--solo-footer-clearance, 0px) + 7.4rem) }
.aof-stage { top: 13%; bottom: var(--sb) }
.aof-box { left: 50%; top: calc(13% + .66 * (87% - var(--sb))); width: min(66cqh, 62cqw); aspect-ratio: 1; translate: -50% -50% }
.aof-word { font-size: min(9cqh, 9cqw) }
.aof-c0, .aof-c1, .aof-c2, .aof-c3, .aof-f0, .aof-f1, .aof-f2 { translate: -50% 0 }
.aof-c0 { left: 17%; bottom: 0; height: min(40cqh, 50cqw) }
.aof-c3 { left: 83%; bottom: 0; height: min(40cqh, 50cqw) }
.aof-c1 { left: 31%; bottom: 31%; height: min(33cqh, 42cqw) }
.aof-c2 { left: 69%; bottom: 31%; height: min(33cqh, 42cqw) }
.aof-f0 { left: 50%; bottom: 12%; height: min(24cqh, 30cqw) }
.aof-f1 { left: 34%; bottom: 3%; height: min(18cqh, 23cqw) }
.aof-f2 { left: 66%; bottom: 4%; height: min(19cqh, 24cqw) }
.aof-schar { left: -20%; bottom: -2%; height: 76cqh; aspect-ratio: 260 / 280 }
.aof-burst { left: 34%; top: 66%; width: 118cqw }
.aof-senemy { right: 3%; top: 21%; height: 19cqh; aspect-ratio: 120 / 110 }
.aof-stext { left: 5%; right: 5%; top: 5%; align-items: flex-start }
.aof-fword { font-size: 14cqw }
.aof-res { left: 0; right: 0; bottom: 0; height: 60% }
.aof-panel { clip-path: polygon(0 5%, 14% 0, 33% 4%, 55% 0, 76% 5%, 100% 1%, 100% 100%, 0 100%) }
.aof-sliver { translate: 0 -4% }
.aof-pad { padding: 7% 7% calc(var(--solo-footer-clearance, 0px) + 1rem) 7% }
.aof-total { font-size: 13cqw }
.aof-stamp { right: 4%; top: -6%; width: 30cqw }
@container (min-width: 40rem) {
  .aof-cam { --sb: calc(var(--solo-footer-clearance, 0px) + 5.4rem) }
  .aof-word { font-size: min(10cqh, 6cqw) }
  .aof-c0 { left: 12%; height: min(53cqh, 34cqw) }
  .aof-c3 { left: 88%; height: min(53cqh, 34cqw) }
  .aof-c1 { left: 29%; bottom: 9%; height: min(46cqh, 29cqw) }
  .aof-c2 { left: 71%; bottom: 9%; height: min(46cqh, 29cqw) }
  .aof-f0 { left: 50%; bottom: 5%; height: min(31cqh, 15cqw) }
  .aof-f1 { left: 41%; bottom: -1%; height: min(23cqh, 11.5cqw) }
  .aof-f2 { left: 59.5%; bottom: 0; height: min(25cqh, 12.5cqw) }
  .aof-schar { left: -4%; bottom: -3%; height: 106cqh }
  .aof-burst { left: 24%; top: 54%; width: min(100cqh, 56cqw) }
  .aof-senemy { right: 9%; top: auto; bottom: 8%; height: 44cqh }
  .aof-stext { left: auto; right: 4%; top: 7%; align-items: flex-end }
  .aof-fword { font-size: min(16cqh, 8.5cqw) }
  .aof-stext .aof-fword h3 { transform-origin: right center }
  .aof-res { left: auto; top: 0; width: 50%; height: auto }
  .aof-panel { clip-path: polygon(10% 0, 100% 0, 100% 100%, 0 100%, 6% 80%, 2% 61%, 8% 41%, 3% 20%) }
  .aof-sliver { translate: -4% 0 }
  .aof-pad { padding: 2rem 7% calc(var(--solo-footer-clearance, 0px) + 1.25rem) 15% }
  .aof-total { font-size: min(15cqh, 7.5cqw) }
  .aof-stamp { right: 5%; top: 6%; width: min(30cqh, 15cqw) }
}
.aof-still, .aof-still * { animation: none !important }
@container (min-width: 88rem) and (min-height: 800px) {
  .aof-ui { zoom: 1.45 }
  .aof-cam { --sb: calc(var(--solo-footer-clearance, 0px) + 8.4rem) }
}
@container (min-width: 40rem) and (max-height: 560px) {
  .aof-hud { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: .9rem; max-width: 70% }
  .aof-hud h2 { font-size: 30px }
}
`

const GO_CLIP = 'polygon(4% 8%, 22% 0, 52% 6%, 100% 0, 95% 52%, 100% 100%, 60% 92%, 30% 100%, 0 90%, 3% 48%)'

/* ───────────── 本体 ───────────── */

export function AllOutFinish() {
  const reduced = !!useReducedMotion()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fHero = `aof-hero-${uid}`
  const fFoe = `aof-foe-${uid}`
  const fStamp = `aof-stamp-${uid}`
  const [fin, setFin] = useState(0)
  const [slow, setSlow] = useState(false)
  const [running, setRunning] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const shakeRef = useRef<HTMLDivElement>(null)
  const camRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const glHostRef = useRef<HTMLDivElement>(null)
  const splatRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLParagraphElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const rtRef = useRef<gsap.core.Timeline | null>(null)
  const runningRef = useRef(false)
  const finRef = useRef(0)
  const slowRef = useRef(false)
  const reducedRef = useRef(reduced)
  const eng = useRef({
    gl: null as CloudGL | null,
    cloud: { r: 0, pulse: 0 },
    splat: { t: 0 },
    sim: { t: 0, on: false, drops: [] as Drop[], k: 1 },
    geo: { cx: 0, cy: 0, R: 100, dpr: 1 },
    drawn: false,
  }).current
  const frameRef = useRef<() => void>(() => {})

  useEffect(() => {
    finRef.current = fin
  }, [fin])
  useEffect(() => {
    slowRef.current = slow
    tlRef.current?.timeScale(slow ? SLOW : 1)
    rtRef.current?.timeScale(slow ? SLOW : 1)
  }, [slow])
  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  /* WebGL の初期化(canvas は毎回作り直すので StrictMode の再実行でも失われたコンテキストを使わない) */
  useEffect(() => {
    const host = glHostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 size-full'
    host.appendChild(canvas)
    const ctx = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!ctx) {
      canvas.remove()
      return
    }
    const sh = (type: number, src: string) => {
      const s = ctx.createShader(type)!
      ctx.shaderSource(s, src)
      ctx.compileShader(s)
      return s
    }
    const pr = ctx.createProgram()!
    const vs = sh(ctx.VERTEX_SHADER, CLOUD_VS)
    const fs = sh(ctx.FRAGMENT_SHADER, CLOUD_FS)
    ctx.attachShader(pr, vs)
    ctx.attachShader(pr, fs)
    ctx.linkProgram(pr)
    if (!ctx.getProgramParameter(pr, ctx.LINK_STATUS)) {
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
      return
    }
    ctx.useProgram(pr)
    const buf = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf)
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
    const loc = ctx.getAttribLocation(pr, 'p')
    ctx.enableVertexAttribArray(loc)
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0)
    const u = Object.fromEntries((['uRes', 'uC', 'uR', 'uT', 'uPulse', 'uDpr'] as const).map((k) => [k, ctx.getUniformLocation(pr, k)])) as CloudGL['u']
    eng.gl = { ctx, canvas, u }
    return () => {
      eng.gl = null
      ctx.deleteBuffer(buf)
      ctx.deleteProgram(pr)
      ctx.deleteShader(vs)
      ctx.deleteShader(fs)
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [eng])

  /** 煙の中心と半径、canvas の解像度を測る(カメラの拡大を割り戻してカメラ内の座標にする) */
  const measure = () => {
    const cam = camRef.current
    const box = boxRef.current
    const root = rootRef.current
    if (!cam || !box || !root) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const cr = cam.getBoundingClientRect()
    const s = cr.width / (cam.offsetWidth || 1) || 1
    const br = box.getBoundingClientRect()
    eng.geo = { cx: (br.left + br.width / 2 - cr.left) / s, cy: (br.top + br.height / 2 - cr.top) / s, R: br.width / 2 / s, dpr }
    const cv = eng.gl?.canvas
    if (cv) {
      const W = Math.max(1, Math.round(cam.offsetWidth * dpr))
      const H = Math.max(1, Math.round(cam.offsetHeight * dpr))
      if (cv.width !== W || cv.height !== H) {
        cv.width = W
        cv.height = H
        eng.drawn = true
      }
    }
    const sp = splatRef.current
    if (sp) {
      const W = Math.max(1, Math.round(root.clientWidth * dpr))
      const H = Math.max(1, Math.round(root.clientHeight * dpr))
      if (sp.width !== W || sp.height !== H) {
        sp.width = W
        sp.height = H
        eng.sim.on = false
        eng.sim.t = 0
      }
    }
  }

  /* 毎フレームの描画(gsap.ticker に載せるのは演出中だけ) */
  frameRef.current = () => {
    const { gl, cloud, geo, splat, sim } = eng
    // 煙
    if (gl && (cloud.r > 0.001 || eng.drawn)) {
      const { ctx, canvas, u } = gl
      ctx.viewport(0, 0, canvas.width, canvas.height)
      ctx.clearColor(0, 0, 0, 0)
      ctx.clear(ctx.COLOR_BUFFER_BIT)
      if (cloud.r > 0.001) {
        ctx.uniform2f(u.uRes, canvas.width, canvas.height)
        ctx.uniform2f(u.uC, geo.cx * geo.dpr, canvas.height - geo.cy * geo.dpr)
        ctx.uniform1f(u.uR, Math.max(1, geo.R * geo.dpr * cloud.r))
        ctx.uniform1f(u.uT, tlRef.current?.time() ?? 0)
        ctx.uniform1f(u.uPulse, cloud.pulse)
        ctx.uniform1f(u.uDpr, geo.dpr)
        ctx.drawArrays(ctx.TRIANGLES, 0, 3)
      }
      eng.drawn = cloud.r > 0.001
    }
    // インク飛沫(消さずに描き重ねて軌跡を残す)
    const cv = splatRef.current
    const c2 = cv?.getContext('2d')
    if (!cv || !c2) return
    if (splat.t <= 0) {
      if (sim.on || sim.t > 0) {
        c2.setTransform(1, 0, 0, 1, 0, 0)
        c2.clearRect(0, 0, cv.width, cv.height)
        sim.on = false
        sim.t = 0
      }
      return
    }
    if (!sim.on) {
      const root = rootRef.current
      const foe = root?.querySelector<HTMLElement>('[data-a="sEnemy"]')
      if (!root || !foe) return
      const cr = cv.getBoundingClientRect()
      const fr = foe.getBoundingClientRect()
      const ox = fr.left + fr.width / 2 - cr.left
      const oy = fr.top + fr.height * 0.55 - cr.top
      const w = cv.width / geo.dpr
      const h = cv.height / geo.dpr
      const k = Math.min(w, h) / 480
      const r = mulberry32((Math.random() * 1e9) | 0)
      c2.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0)
      c2.clearRect(0, 0, w, h)
      sim.k = k
      sim.drops = Array.from({ length: 100 }, () => {
        const a = r() < 0.75 ? -Math.PI * 0.35 + (r() - 0.5) * Math.PI * 1.7 : r() * Math.PI * 2
        const sp = (500 + r() ** 1.6 * 2300) * k
        const roll = r()
        return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (2 + r() ** 2 * 11) * k, c: roll < 0.74 ? BLACK : roll < 0.97 ? RED : WHITE, on: true }
      })
      // 着弾の大きな染み
      const blob = (rad: number, col: string, seed: number) => {
        const rr = mulberry32(seed)
        c2.fillStyle = col
        c2.beginPath()
        const n = 34
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2
          const m = i % 2 ? 0.55 + rr() * 0.3 : 0.85 + rr() * (rr() < 0.25 ? 0.9 : 0.3)
          const x = ox + Math.cos(a) * rad * m
          const y = oy + Math.sin(a) * rad * m
          if (i) c2.lineTo(x, y)
          else c2.moveTo(x, y)
        }
        c2.fill()
      }
      blob(92 * k, BLACK, 3)
      blob(44 * k, RED, 9)
      blob(16 * k, BLACK, 12)
      sim.on = true
      sim.t = 0
    }
    const DT = 1 / 120
    c2.lineCap = 'round'
    while (sim.t + DT <= splat.t) {
      sim.t += DT
      const g = 260 * sim.k
      for (const d of sim.drops) {
        if (!d.on) continue
        const px = d.x
        const py = d.y
        d.vx *= 0.955
        d.vy = d.vy * 0.955 + g * DT
        d.x += d.vx * DT
        d.y += d.vy * DT
        d.r *= 0.972
        c2.strokeStyle = d.c
        c2.lineWidth = d.r * 2
        c2.beginPath()
        c2.moveTo(px, py)
        c2.lineTo(d.x, d.y)
        c2.stroke()
        if (Math.hypot(d.vx, d.vy) < 40 * sim.k || d.r < 0.35) {
          d.on = false
          c2.fillStyle = d.c
          c2.beginPath()
          c2.arc(d.x, d.y, Math.max(1.2 * sim.k, d.r * 2.6), 0, Math.PI * 2)
          c2.fill()
        }
      }
    }
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(root)
    measure()
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tickFn = useRef(() => frameRef.current()).current

  const say = (msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg
  }

  const finish = () => {
    gsap.ticker.remove(tickFn)
    tlRef.current?.kill()
    rtRef.current?.kill()
    tlRef.current = null
    rtRef.current = null
    eng.cloud.r = 0
    eng.splat.t = 0
    frameRef.current()
    runningRef.current = false
    setRunning(false)
  }

  useEffect(
    () => () => {
      gsap.ticker.remove(tickFn)
      tlRef.current?.kill()
      rtRef.current?.kill()
    },
    [tickFn],
  )

  /** 演出 1 回分のタイムラインを組む(秒) */
  const build = () => {
    const root = rootRef.current!
    const cam = camRef.current!
    const shake = shakeRef.current!
    const q = gsap.utils.selector(root)
    const one = (s: string) => q(`[data-a="${s}"]`)[0] as HTMLElement
    const all = (s: string) => q(`[data-a="${s}"]`) as HTMLElement[]
    const W = root.clientWidth
    const H = root.clientHeight
    const wide = W >= 640
    const k = Math.min(W, H) / 440
    const { cloud, splat, geo } = eng
    const fi = finRef.current
    const rnd = mulberry32((Math.random() * 1e9) | 0)
    const tl = gsap.timeline({ paused: true })

    const shakeAt = (el: Element, at: number, amp: number, n = 6) => {
      for (let i = 0; i < n; i++) {
        const f = 1 - i / n
        tl.to(el, { x: (i % 2 ? -1 : 1) * amp * f * k * (0.6 + rnd() * 0.4), y: (rnd() - 0.5) * amp * f * k * 1.4, duration: 0.03, ease: 'none' }, at + i * 0.03)
      }
      tl.to(el, { x: 0, y: 0, duration: 0.04, ease: 'none' }, at + n * 0.03)
    }
    const flash = (at: number, v: number) => {
      const el = one('flash')
      tl.set(el, { autoAlpha: v }, at).to(el, { autoAlpha: 0, duration: 0.1, ease: 'power1.out' }, at + 0.035)
    }
    const pulse = (at: number) => tl.fromTo(cloud, { pulse: 1 }, { pulse: 0, duration: 0.22, ease: 'power2.out', immediateRender: false }, at)

    gsap.set(cam, { transformOrigin: `${geo.cx}px ${geo.cy}px` })
    tl.call(() => say(`総攻撃! とどめは${CREW[fi].name}`), [], 0)

    /* ── 突撃 ── */
    const banner = one('banner')
    tl.fromTo(banner, { xPercent: -120, autoAlpha: 1 }, { xPercent: 0, duration: 0.16, ease: 'power4.out' }, 0.02)
    tl.fromTo(all('bannerL'), { scale: 2.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, stagger: 0.04, duration: 0.12, ease: 'back.out(3)' }, 0.07)
    tl.to(banner, { xPercent: 120, duration: 0.15, ease: 'power3.in' }, 0.5)
    tl.set(banner, { autoAlpha: 0 }, 0.66)

    const speed = one('speed')
    tl.fromTo(speed, { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 1, scale: 1, duration: 0.1, ease: 'power2.out' }, 0.12)
    tl.fromTo(one('speedRot'), { rotation: 0 }, { rotation: 21, svgOrigin: '0 0', duration: 0.62, ease: 'steps(12)' }, 0.12)
    tl.to(speed, { autoAlpha: 0, duration: 0.14 }, 0.7)

    tl.to(cam, { scale: 1.32, rotation: -2.5, duration: 0.56, ease: 'power2.in' }, 0.04)

    const cr = cam.getBoundingClientRect()
    const B = 0.62
    const crews = all('crew')
    const order = [0, 3, 1, 2]
    crews.forEach((el, i) => {
      const side = i < 2 ? 1 : -1
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2 - cr.left
      const bottom = r.bottom - cr.top
      const tx = geo.cx - side * geo.R * (0.12 + 0.12 * (i === 0 || i === 3 ? 1 : 0)) - cx
      const ty = geo.cy + geo.R * 0.5 - bottom
      const d = 0.16 + order.indexOf(i) * 0.045
      const sq = el.querySelector('[data-a="squash"]')!
      const stand = el.querySelector('[data-a="stand"]')!
      const leap = el.querySelector('[data-a="leap"]')!
      const ghosts = el.querySelectorAll('[data-a="ghost"]')
      tl.to(sq, { scaleY: 0.82, scaleX: 1.1, duration: 0.1, ease: 'power2.out' }, d - 0.12)
      tl.set(stand, { autoAlpha: 0 }, d).set(leap, { autoAlpha: 1 }, d)
      tl.to(sq, { scaleY: 0.92, scaleX: 1.28, duration: 0.08, ease: 'power2.out' }, d)
      tl.to(el, { x: tx, duration: 0.38, ease: 'power2.in' }, d)
      tl.to(el, { y: ty * 0.3 - H * 0.2, duration: 0.17, ease: 'power2.out' }, d)
      tl.to(el, { y: ty, duration: 0.21, ease: 'power2.in' }, d + 0.17)
      tl.to(el, { rotation: side * 16, duration: 0.2, ease: 'power2.out' }, d)
      ghosts.forEach((g, j) => {
        tl.fromTo(g, { autoAlpha: 0, x: 0, y: 0 }, { autoAlpha: 0.6 - j * 0.22, x: -(j + 1) * 30 * k, y: (j + 1) * 6 * k, duration: 0.12, ease: 'power2.out' }, d + 0.02)
      })
      tl.set(el, { autoAlpha: 0 }, B + 0.02)
    })

    const foes = all('foe')
    tl.fromTo(all('surprise'), { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.1, ease: 'back.out(3)', stagger: 0.03 }, 0.34)
    tl.to(foes, { y: -16 * k, scaleY: 1.12, duration: 0.07, ease: 'power2.out', stagger: 0.03 }, 0.36)
    tl.to(foes, { y: 0, scaleY: 1, duration: 0.1, ease: 'power2.in', stagger: 0.03 }, 0.44)
    tl.set([...foes, ...all('surprise'), ...all('foeTxt'), one('ring')], { autoAlpha: 0 }, B + 0.02)

    /* ── 乱闘 ── */
    tl.addLabel('brawl', B)
    flash(B, 0.9)
    tl.fromTo(cloud, { r: 0 }, { r: 1, duration: 0.34, ease: 'back.out(2.4)', immediateRender: false }, B)
    if (!eng.gl) tl.fromTo(one('cloudFb'), { scale: 0, autoAlpha: 1 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, B)
    tl.to(cam, { scale: 1.06, rotation: 0, duration: 0.36, ease: 'power3.out' }, B)
    shakeAt(shake, B, 16, 8)

    const pops = all('pop')
    const stars = all('star')
    const slashes = all('slash')
    const flashes = all('inFlash')
    const words = all('word')
    BRAWL.forEach(([t0, kind, idx, amp]) => {
      const t = B + t0
      if (kind === 'pop') {
        const el = pops[idx]
        tl.fromTo(el, { autoAlpha: 1, scale: 0, x: '-30%' }, { scale: 1, x: '0%', duration: 0.05, ease: 'back.out(3)' }, t)
        tl.to(el, { scale: 0.3, autoAlpha: 0, duration: 0.07, ease: 'power2.in' }, t + 0.17)
      } else if (kind === 'star') {
        const el = stars[idx]
        tl.fromTo(el, { autoAlpha: 1, scale: 0, rotation: -40 }, { scale: 1.15, rotation: 0, duration: 0.05, ease: 'power2.out' }, t)
        tl.to(el, { scale: 0, rotation: 50, duration: 0.12, ease: 'power2.in' }, t + 0.09)
      } else if (kind === 'slash') {
        const el = slashes[idx]
        tl.fromTo(el, { autoAlpha: 1, scaleX: 0, scaleY: 1 }, { scaleX: 1, duration: 0.07, ease: 'power4.out' }, t)
        tl.to(el, { scaleY: 0, autoAlpha: 0, duration: 0.12, ease: 'power2.in' }, t + 0.1)
      } else if (kind === 'flash') {
        const el = flashes[idx]
        tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 0.95, duration: 0.02 }, t)
        tl.to(el, { autoAlpha: 0, duration: 0.08 }, t + 0.07)
      } else {
        const el = words[idx]
        const hold = idx === 3 ? 0.46 : 0.28
        tl.fromTo(el, { autoAlpha: 1, scale: 2.6 }, { scale: 1, duration: 0.12, ease: 'back.out(2.6)' }, t)
        tl.fromTo(el.querySelectorAll('[data-a="wordL"]'), { y: '-70%', autoAlpha: 0 }, { y: '0%', autoAlpha: 1, duration: 0.1, stagger: 0.03, ease: 'back.out(3)' }, t)
        tl.to(el, { x: (idx % 2 ? 1 : -1) * 14 * k, duration: hold, ease: 'none' }, t + 0.12)
        tl.to(el, { scale: 0.5, autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, t + 0.12 + hold)
        shakeAt(shake, t, idx === 3 ? 22 : 10, idx === 3 ? 8 : 4)
        pulse(t)
      }
      if (amp) {
        shakeAt(shake, t, amp, 4)
        pulse(t)
      }
    })

    const SW = B + 1.64
    tl.to(cloud, { r: 1.55, duration: 0.14, ease: 'power2.in' }, SW)
    tl.to(cam, { scale: 1.4, duration: 0.16, ease: 'power3.in' }, SW)
    flash(SW + 0.12, 1)
    const F = B + 1.8
    tl.set(cloud, { r: 0 }, F)
    if (!eng.gl) tl.set(one('cloudFb'), { autoAlpha: 0 }, F)

    /* ── とどめの一枚絵 ── */
    tl.addLabel('finish', F)
    tl.call(() => say(`${CREW[fi].name}のとどめ、${CREW[fi].word}`), [], F)
    const splash = one('splash')
    const sShake = one('splashShake')
    tl.set(splash, { autoAlpha: 1 }, F)
    tl.set(one('impact'), { autoAlpha: 1 }, F).set(one('impact'), { autoAlpha: 0 }, F + 0.08)
    tl.fromTo(one('impactFig'), { scale: 1.2 }, { scale: 1, duration: 0.08, ease: 'none' }, F)
    all('band').forEach((b, i) => {
      tl.fromTo(b, { xPercent: i % 2 ? 115 : -115 }, { xPercent: 0, duration: 0.24, ease: 'expo.out' }, F + 0.06 + i * 0.04)
      tl.to(b, { xPercent: i % 2 ? -4 : 4, duration: 1.3, ease: 'none' }, F + 0.3 + i * 0.04)
    })
    tl.fromTo(one('rays'), { rotation: -30, scale: 0.6 }, { rotation: 30, scale: 1, duration: 1.6, ease: 'power2.out' }, F + 0.06)
    tl.fromTo(one('sDots'), { autoAlpha: 0, x: -50 * k }, { autoAlpha: 1, x: 0, duration: 0.25, ease: 'power3.out' }, F + 0.08)
    const motif = one('motif')
    tl.fromTo(motif, { scale: 0.2, rotation: -90, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.3, ease: 'back.out(1.8)' }, F + 0.08)
    tl.to(motif, { rotation: 24, duration: 1.3, ease: 'none' }, F + 0.38)
    tl.fromTo(one('burst'), { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.24, ease: 'back.out(2)' }, F + 0.08)
    const sChar = one('sChar')
    tl.fromTo(sChar, { xPercent: -45, scale: 1.25 }, { xPercent: 0, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }, F + 0.08)
    tl.to(sChar, { xPercent: 3, scale: 1.04, duration: 1.3, ease: 'none' }, F + 0.38)
    tl.fromTo(one('sTag'), { xPercent: 80, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.18, ease: 'power4.out' }, F + 0.16)
    tl.fromTo(one('brush'), { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power4.out' }, F + 0.18)
    const wl = all('fWordL')
    tl.fromTo(wl, { scale: 2.8, autoAlpha: 0, y: '-40%' }, { scale: 1, autoAlpha: 1, y: '0%', duration: 0.2, ease: 'back.out(3)', stagger: 0.06 }, F + 0.2)
    wl.forEach((_, i) => shakeAt(sShake, F + 0.26 + i * 0.06, 7, 3))
    tl.fromTo(one('sFinish'), { xPercent: 60, autoAlpha: 0, skewX: -30 }, { xPercent: 0, autoAlpha: 1, skewX: 0, duration: 0.22, ease: 'expo.out' }, F + 0.46)
    const se = one('sEnemy')
    tl.fromTo(se, { autoAlpha: 1, scale: 1, x: 0, filter: 'none' }, { x: 9 * k, duration: 0.035, repeat: 8, yoyo: true, ease: 'none' }, F + 0.22)
    tl.set(se, { filter: 'brightness(0) invert(1)' }, F + 0.56).set(se, { filter: 'none' }, F + 0.6)
    const BU = F + 0.64
    tl.to(se, { scale: 1.4, autoAlpha: 0, duration: 0.08, ease: 'power2.out' }, BU)
    tl.fromTo(one('sRing'), { autoAlpha: 1, scale: 0.2 }, { autoAlpha: 0, scale: 2.6, duration: 0.4, ease: 'power2.out', immediateRender: false }, BU)
    tl.fromTo(splat, { t: 0 }, { t: 1.3, duration: 1.3, ease: 'none', immediateRender: false }, BU)
    tl.set(sShake, { filter: 'invert(1)' }, BU).set(sShake, { filter: 'none' }, BU + 0.06)
    shakeAt(sShake, BU, 20, 9)
    tl.addLabel('finishHold', F + 1.3)

    /* ── リザルト ── */
    const R = F + 1.5
    tl.addLabel('results', R)
    const dmg = CREW.map((_, i) => Math.round((1400 + rnd() * 1300) * (i === fi ? 2.6 : 1)))
    const total = dmg.reduce((a, b) => a + b, 0)
    const max = Math.max(...dmg)
    all('rowDmg').forEach((el, i) => (el.textContent = dmg[i].toLocaleString('ja-JP')))
    const totalEl = one('total')
    const cnt = { v: 0 }
    tl.set(one('results'), { autoAlpha: 1 }, R)
    tl.to(one('sText'), { autoAlpha: 0, x: 60 * k, duration: 0.14, ease: 'power2.in' }, R)
    tl.fromTo(one('resPanel'), wide ? { xPercent: 110, yPercent: 0 } : { yPercent: 110, xPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.28, ease: 'expo.out' }, R)
    tl.fromTo(one('resSliver'), wide ? { xPercent: 130, yPercent: 0 } : { yPercent: 130, xPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.32, ease: 'expo.out' }, R + 0.05)
    tl.fromTo(all('resRow'), { x: 40 * k, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.2, stagger: 0.05, ease: 'power3.out' }, R + 0.12)
    tl.fromTo(
      cnt,
      { v: 0 },
      {
        v: total,
        duration: 0.75,
        ease: 'power2.out',
        immediateRender: false,
        onUpdate: () => {
          totalEl.textContent = Math.round(cnt.v).toLocaleString('ja-JP')
        },
      },
      R + 0.18,
    )
    all('bar').forEach((b, i) => tl.fromTo(b, { scaleX: 0 }, { scaleX: dmg[i] / max, duration: 0.5, ease: 'power3.out' }, R + 0.26 + i * 0.06))
    const stamp = one('stamp')
    tl.fromTo(stamp, { autoAlpha: 0, scale: 3.4, rotation: -50 }, { autoAlpha: 1, scale: 1, rotation: -14, duration: 0.13, ease: 'power4.in' }, R + 0.98)
    tl.fromTo(one('stampRing'), { autoAlpha: 0.9, scale: 0.8 }, { autoAlpha: 0, scale: 2.1, duration: 0.4, ease: 'power2.out', immediateRender: false }, R + 1.11)
    shakeAt(one('resShake'), R + 1.11, 12, 6)
    tl.call(() => say(`撃破! 総ダメージ ${total.toLocaleString('ja-JP')}`), [], R + 1.11)
    tl.addLabel('resultsEnd', R + 1.56)

    /* ── 待機に戻る ── */
    const O = R + 3.0
    tl.addLabel('outro', O)
    tl.set(cam, { scale: 1, rotation: 0, x: 0, y: 0 }, O)
    tl.set(shake, { x: 0, y: 0 }, O)
    tl.set(crews, { x: 0, y: 0, rotation: 0, autoAlpha: 1 }, O)
    tl.set(all('squash'), { scaleX: 1, scaleY: 1 }, O)
    tl.set(all('stand'), { autoAlpha: 1 }, O)
    tl.set([...all('leap'), ...all('ghost')], { autoAlpha: 0 }, O)
    tl.set(foes, { autoAlpha: 1, scale: 0, y: 0, scaleY: 1 }, O)
    tl.to([splash, one('results')], { autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, O)
    tl.fromTo(foes, { scale: 0 }, { scale: 1, duration: 0.32, ease: 'back.out(2.5)', stagger: 0.06, immediateRender: false }, O + 0.22)
    tl.to([...all('foeTxt'), one('ring')], { autoAlpha: 1, duration: 0.2 }, O + 0.4)
    tl.set(splat, { t: 0 }, O + 0.36)
    tl.set(one('sText'), { autoAlpha: 1, x: 0 }, O + 0.36)
    tl.set(stamp, { autoAlpha: 0 }, O + 0.36)
    tl.addLabel('end', O + 0.62)
    tl.set({}, {}, O + 0.62)
    return tl
  }

  const start = () => {
    if (runningRef.current) return
    const root = rootRef.current
    if (!root) return
    if (root.contains(document.activeElement)) root.focus({ preventScroll: true })
    measure()
    runningRef.current = true
    setRunning(true)
    const tl = build()
    tlRef.current = tl
    gsap.ticker.add(tickFn)
    const scale = slowRef.current ? SLOW : 1
    if (!reducedRef.current) {
      tl.eventCallback('onComplete', finish)
      tl.timeScale(scale).play(0)
      return
    }
    // 動きを減らす: 一枚絵とリザルトを静止画としてフェードで見せる
    const q = gsap.utils.selector(root)
    const sf = q('[data-a="splashFade"]')[0]
    const rf = q('[data-a="resultsFade"]')[0]
    const restoreStage = () => {
      gsap.set(camRef.current, { scale: 1, rotation: 0, x: 0, y: 0 })
      gsap.set(q('[data-a="crew"]'), { x: 0, y: 0, rotation: 0, autoAlpha: 1 })
      gsap.set(q('[data-a="stand"]'), { autoAlpha: 1 })
      gsap.set(q('[data-a="leap"], [data-a="ghost"]'), { autoAlpha: 0 })
      gsap.set(q('[data-a="foe"]'), { autoAlpha: 1, y: 0, scale: 1, scaleY: 1 })
      gsap.set(q('[data-a="speed"], [data-a="banner"], [data-a="flash"], [data-a="surprise"]'), { autoAlpha: 0 })
    }
    const rt = gsap.timeline({ onComplete: finish })
    rt.set(sf, { opacity: 0 })
      .call(() => {
        tl.seek('finishHold', false)
        restoreStage()
      })
      .to(sf, { opacity: 1, duration: 0.3 })
      .set(rf, { opacity: 0 }, 1.8)
      .call(() => tl.seek('resultsEnd', false), [], 1.8)
      .to(rf, { opacity: 1, duration: 0.3 }, 1.8)
      .to([sf, rf], { opacity: 0, duration: 0.3 }, 4.8)
      .call(() => tl.seek('end', false), [], 5.12)
      .set([sf, rf], { opacity: 1 }, 5.14)
    rt.timeScale(scale)
    rtRef.current = rt
  }

  const skip = () => {
    const rt = rtRef.current
    if (rt) {
      rt.progress(1)
      return
    }
    const tl = tlRef.current
    if (!tl) return
    const t = tl.time()
    if (t < tl.labels.results) tl.seek('results', false)
    else if (t < tl.labels.outro) tl.seek('outro', false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      if (!runningRef.current) return
      e.preventDefault()
      skip()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (runningRef.current) return
      const t = e.target as HTMLElement
      if (t !== e.currentTarget && t.closest('button')) return
      e.preventDefault()
      start()
    }
  }

  const crew = CREW[fin]

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="総攻撃のフィニッシュ演出デモ。Enter または Space で総攻撃、Esc でスキップ"
      className={`relative h-full w-full overflow-hidden bg-[#0c0b0d] [container-type:size] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset ${reduced ? 'aof-still' : ''}`}
    >
      <style>{CSS}</style>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <filter id={fHero} x="-25%" y="-15%" width="160%" height="135%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="fat" />
            <feFlood floodColor={WHITE} />
            <feComposite in2="fat" operator="in" result="outline" />
            <feOffset in="fat" dx="10" dy="7" result="off" />
            <feFlood floodColor={RED} />
            <feComposite in2="off" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={fFoe} x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="fat" />
            <feFlood floodColor={RED} />
            <feComposite in2="fat" operator="in" result="outer" />
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="thin" />
            <feFlood floodColor={WHITE} />
            <feComposite in2="thin" operator="in" result="inner" />
            <feMerge>
              <feMergeNode in="outer" />
              <feMergeNode in="inner" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={fStamp} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 4.6" result="m" />
            <feComposite in="d" in2="m" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* ───── 舞台(カメラ) ───── */}
      <div ref={shakeRef} className="absolute inset-0">
        <div ref={camRef} className="aof-cam absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 72%, #4a0b10 0%, #1a0709 45%, #0c0b0d 80%)' }} />
          <div
            aria-hidden
            className="absolute top-[70%] left-1/2 aspect-square w-[190cqmax] max-w-none"
            style={{
              translate: '-50% -50%',
              background: `repeating-conic-gradient(from 0deg, rgba(227,20,30,.55) 0deg 5deg, transparent 5deg 15deg)`,
              maskImage: 'radial-gradient(circle, #000 0, rgba(0,0,0,.6) 18%, transparent 38%)',
              WebkitMaskImage: 'radial-gradient(circle, #000 0, rgba(0,0,0,.6) 18%, transparent 38%)',
              animation: 'aof-spin 80s linear infinite',
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[-3%] bottom-[18%] font-['Space_Grotesk'] text-[min(30cqh,22cqw)] leading-none font-bold tracking-tighter text-transparent italic"
            style={{ WebkitTextStroke: '2px rgba(227,20,30,.35)', rotate: '-6deg' }}
          >
            HOLD UP
          </span>
          <div
            aria-hidden
            className="absolute -top-8 -right-8 size-[48%]"
            style={{
              backgroundImage: `radial-gradient(${RED} 30%, transparent 33%)`,
              backgroundSize: '10px 10px',
              opacity: 0.5,
              maskImage: 'radial-gradient(circle at 100% 0%, #000, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle at 100% 0%, #000, transparent 62%)',
            }}
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: 'linear-gradient(180deg, transparent, rgba(12,11,13,.85) 55%)' }} />

          <div className="aof-stage absolute inset-x-0">
            {/* 包囲の輪 */}
            <svg data-a="ring" viewBox="-100 -20 200 40" className="absolute bottom-[-4%] left-1/2 w-[min(70cqw,120cqh)] -translate-x-1/2 overflow-visible" aria-hidden>
              <ellipse rx="96" ry="15" fill="rgba(227,20,30,.25)" />
              <polygon points={starPoints(3, 26, 98, 86).replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${x},${(+y * 0.16).toFixed(1)}`)} fill="none" stroke={WHITE} strokeWidth="1.6" strokeLinejoin="miter" />
            </svg>

            {/* 敵 */}
            {[
              { v: 0, z: 1, txt: 'ヒィッ…', tx: '-28%', ty: '-6%' },
              { v: 1, z: 2, txt: '', tx: '', ty: '' },
              { v: 2, z: 2, txt: 'お助けを…', tx: '70%', ty: '4%' },
            ].map((f, i) => (
              <div key={i} className={`aof-f${i} absolute aspect-[120/110]`} style={{ zIndex: f.z }}>
                <div data-a="foe" className="absolute inset-0 origin-bottom">
                  <div className="absolute inset-0" style={{ animation: `aof-tremble ${0.13 + i * 0.02}s steps(2) infinite` }}>
                    <svg viewBox="0 0 120 110" className="size-full overflow-visible" aria-hidden>
                      <g filter={`url(#${fFoe})`}>
                        <Foe v={f.v} />
                      </g>
                      <path d="M108 30q6 9 0 13q-6-4 0-13z" fill={WHITE} style={{ animation: `aof-drip ${0.9 + i * 0.2}s ease-in infinite` }} />
                    </svg>
                  </div>
                </div>
                <svg data-a="surprise" viewBox="-50 -50 100 100" className="invisible absolute -top-[34%] left-1/2 w-[46%] -translate-x-1/2 overflow-visible opacity-0" aria-hidden>
                  <polygon points={IMPACT} fill={WHITE} stroke={BLACK} strokeWidth="4" />
                  <text y="16" textAnchor="middle" fontSize="44" fontWeight="900" fill={RED} fontFamily="'Noto Sans JP', sans-serif">
                    !!
                  </text>
                </svg>
                {f.txt && (
                  <span
                    data-a="foeTxt"
                    className="absolute top-0 left-0 bg-[#f6f1e7] px-1.5 py-0.5 text-[min(2.6cqh,3cqw)] font-black whitespace-nowrap text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]"
                    style={{ translate: `${f.tx} ${f.ty}`, rotate: i ? '8deg' : '-10deg', animation: 'aof-flicker 1.1s steps(1) infinite' }}
                  >
                    {f.txt}
                  </span>
                )}
              </div>
            ))}

            {/* 仲間 */}
            {CREW.map((c, i) => {
              const mirror = i >= 2
              return (
                <div
                  key={c.name}
                  className={`aof-c${i} absolute aspect-[260/280]`}
                  style={{ zIndex: i === 1 || i === 2 ? 0 : 3 }}
                >
                  <div data-a="crew" className="absolute inset-0 origin-bottom">
                    <div className="absolute inset-0" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
                      <div data-a="squash" className="absolute inset-0 origin-bottom">
                        {[0, 1].map((j) => (
                          <div key={j} data-a="ghost" className="invisible absolute inset-0 opacity-0">
                            <svg viewBox={FIG_VIEW} className="size-full overflow-visible" aria-hidden>
                              <Figure who={i} pose={c.leap} flat={j ? WHITE : RED} />
                            </svg>
                          </div>
                        ))}
                        <div data-a="leap" className="invisible absolute inset-0 opacity-0">
                          <svg viewBox={FIG_VIEW} className="size-full overflow-visible" aria-hidden>
                            <g filter={`url(#${fHero})`}>
                              <Figure who={i} pose={c.leap} />
                            </g>
                          </svg>
                        </div>
                        <div data-a="stand" className="absolute inset-0 origin-bottom" style={{ animation: `aof-breathe ${2.4 + i * 0.3}s ease-in-out infinite` }}>
                          <svg viewBox={FIG_VIEW} className="size-full overflow-visible" aria-hidden>
                            <g filter={`url(#${fHero})`}>
                              <Figure who={i} pose={c.idle} />
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* とどめ役の目印 */}
                    <div
                      aria-hidden
                      className={`absolute top-[-1%] left-[48%] flex flex-col items-center transition-opacity duration-150 ${fin === i && !running ? 'opacity-100' : 'opacity-0'}`}
                      style={{ animation: 'aof-bob .8s ease-in-out infinite', translate: '-50% 0' }}
                    >
                      <span className="-skew-x-12 bg-[#e3141e] px-1.5 text-[min(2.6cqh,2.8cqw)] font-black whitespace-nowrap text-[#f6f1e7] ring-2 ring-[#0c0b0d]">とどめ</span>
                      <svg viewBox="0 0 20 12" className="mt-0.5 w-[min(2.6cqh,3cqw)]">
                        <path d="M0 0h20L10 12z" fill={RED} stroke={BLACK} strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 煙(WebGL) */}
          <div ref={glHostRef} className="pointer-events-none absolute inset-0 z-10" />

          {/* 煙の上の乱闘 */}
          <div ref={boxRef} className="aof-box pointer-events-none absolute z-20" aria-hidden>
            <div data-a="cloudFb" className="invisible absolute inset-[6%] rounded-full bg-[#0c0b0d] opacity-0 shadow-[0_0_0_6px_#f6f1e7,0_0_0_12px_#e3141e]" />
            {FLASH_SPOTS.map((f, i) => (
              <div key={i} data-a="inFlash" className="invisible absolute w-[56%] opacity-0" style={{ left: `${f.x}%`, top: `${f.y}%`, translate: '-50% -50%', rotate: `${f.rot}deg`, aspectRatio: '260 / 280' }}>
                <svg viewBox={FIG_VIEW} className="size-full overflow-visible">
                  <Figure who={f.who} pose={CREW[f.who].leap} flat={WHITE} />
                </svg>
              </div>
            ))}
            {SLASH_ROT.map((rot, i) => (
              <div key={i} className="absolute top-1/2 left-[-20%] h-[4.5%] w-[140%]" style={{ rotate: `${rot}deg`, translate: '0 -50%' }}>
                <div data-a="slash" className="invisible relative size-full origin-left opacity-0">
                  <div className="absolute inset-0 translate-y-[35%] bg-[#e3141e]" style={{ clipPath: 'polygon(0 50%, 9% 0, 100% 46%, 100% 54%, 9% 100%)' }} />
                  <div className="absolute inset-0 bg-[#f6f1e7]" style={{ clipPath: 'polygon(0 50%, 9% 0, 100% 46%, 100% 54%, 9% 100%)' }} />
                </div>
              </div>
            ))}
            {POP_ANGLES.map((a, i) => {
              const rad = (a * Math.PI) / 180
              return (
                <div
                  key={i}
                  className="absolute w-[38%]"
                  style={{ left: `${50 + Math.cos(rad) * 34}%`, top: `${50 + Math.sin(rad) * 34}%`, rotate: `${a}deg`, transformOrigin: '0 50%', translate: '0 -50%', aspectRatio: '64 / 40' }}
                >
                  <div data-a="pop" className="invisible size-full origin-left opacity-0">
                    <svg viewBox="0 -6 64 52" className="size-full overflow-visible">
                      <g filter={`url(#${fHero})`}>{POP_SHAPES[i]}</g>
                    </svg>
                  </div>
                </div>
              )
            })}
            {STAR_SPOTS.map((s, i) => (
              <svg
                key={i}
                data-a="star"
                viewBox="-50 -50 100 100"
                className="invisible absolute overflow-visible opacity-0"
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s * (i === 4 ? 1.7 : 1)}%`, translate: '-50% -50%' }}
              >
                <polygon points={IMPACT} fill={WHITE} stroke={BLACK} strokeWidth="4" strokeLinejoin="miter" />
                <polygon points={IMPACT_IN} fill={RED} />
              </svg>
            ))}
            {WORDS.map((w, i) => (
              <div key={i} className="aof-word absolute" style={{ left: `${w.x}%`, top: `${w.y}%`, rotate: `${w.rot}deg` }}>
                <div data-a="word" className="invisible origin-center opacity-0" style={{ fontSize: `${w.size}em` }}>
                  <Cut text={w.text} attr="wordL" seed={i * 7} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 集中線 */}
      <div data-a="speed" className="pointer-events-none invisible absolute inset-0 z-20 opacity-0" aria-hidden>
        <svg viewBox="-100 -88 200 200" preserveAspectRatio="xMidYMid slice" className="size-full">
          <g data-a="speedRot">
            {SPEED_LINES.map((l, i) => (
              <polygon key={i} points={l.pts} fill={l.red ? RED : WHITE} opacity={l.red ? 0.9 : 0.75} />
            ))}
          </g>
        </svg>
      </div>

      {/* 総攻撃の帯 */}
      <div className="pointer-events-none absolute inset-x-[-12%] top-[6%] z-[25] h-[min(22cqh,17cqw)] -rotate-[7deg]" aria-hidden>
        <div data-a="banner" className="invisible relative flex h-full items-center gap-[3cqw] overflow-hidden border-y-[5px] border-[#e3141e] bg-[#0c0b0d] pl-[18%] opacity-0">
          <div className="absolute inset-0 opacity-40" style={{ background: 'repeating-linear-gradient(90deg, transparent 0 22px, rgba(246,241,231,.25) 22px 24px)' }} />
          <span className="relative text-[min(13cqh,10cqw)]">
            <Cut text="総攻撃" attr="bannerL" shadow={RED} seed={3} />
          </span>
          <span className="relative font-['Space_Grotesk'] text-[min(9cqh,6cqw)] font-bold tracking-tighter whitespace-nowrap text-transparent italic [-webkit-text-stroke:2px_#f6f1e7]">ALL-OUT ATTACK</span>
        </div>
      </div>

      {/* ───── とどめの一枚絵 ───── */}
      <div data-a="splashFade" className="pointer-events-none absolute inset-0 z-30" aria-hidden>
        <div data-a="splash" className="invisible absolute inset-0 overflow-hidden opacity-0" style={{ background: RED }}>
          <div data-a="splashShake" className="absolute inset-0">
            <div
              data-a="rays"
              className="absolute aspect-square w-[240cqmax] max-w-none"
              style={{ left: '26%', top: '56%', translate: '-50% -50%', background: 'repeating-conic-gradient(from 0deg, rgba(12,11,13,.34) 0deg 4deg, transparent 4deg 13deg)' }}
            />
            <div
              data-a="sDots"
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(${BLACK} 30%, transparent 33%)`,
                backgroundSize: '13px 13px',
                maskImage: 'linear-gradient(118deg, transparent 38%, #000 70%, transparent 96%)',
                WebkitMaskImage: 'linear-gradient(118deg, transparent 38%, #000 70%, transparent 96%)',
                opacity: 0.55,
              }}
            />
            <div className="absolute aspect-square w-[min(118cqh,92cqw)]" style={{ left: '26%', top: '50%', translate: '-50% -50%' }}>
              <div data-a="motif" className="size-full text-[#0c0b0d]">
                <MotifIcon m={crew.motif} className="size-full opacity-80" />
              </div>
            </div>
            {[
              { top: '50%', h: '30%', bg: BLACK },
              { top: '43%', h: '3.5%', bg: WHITE },
              { top: '7%', h: '17%', bg: BLACK },
              { top: '86%', h: '5%', bg: WHITE },
            ].map((b, i) => (
              <div key={i} className="absolute inset-x-[-20%]" style={{ top: b.top, height: b.h, rotate: '-11deg' }}>
                <div data-a="band" className="size-full" style={{ background: b.bg }} />
              </div>
            ))}
            <div className="aof-burst absolute aspect-square" style={{ translate: '-50% -50%' }}>
              <svg data-a="burst" viewBox="-50 -50 100 100" className="size-full overflow-visible">
                <polygon points={BURST} fill={WHITE} stroke={BLACK} strokeWidth="1.6" />
              </svg>
            </div>
            <canvas ref={splatRef} className="absolute inset-0 size-full" />
            <div className="aof-senemy absolute">
              <div data-a="sEnemy" className="size-full origin-center">
                <svg viewBox="0 0 120 110" className="size-full overflow-visible">
                  <g filter={`url(#${fFoe})`}>
                    <Foe v={0} />
                  </g>
                </svg>
              </div>
              <div data-a="sRing" className="invisible absolute inset-[-10%] rounded-full border-[6px] border-[#f6f1e7] opacity-0" />
            </div>
            <div className="aof-schar absolute">
              <div data-a="sChar" className="size-full origin-bottom">
                <svg viewBox={FIG_VIEW} className="size-full overflow-visible">
                  <g filter={`url(#${fHero})`}>
                    <Figure who={fin} pose={crew.finish} />
                  </g>
                </svg>
              </div>
            </div>
            <div data-a="sText" className="aof-stext absolute flex flex-col gap-[1.2cqh]">
              <span data-a="sTag" className="flex -rotate-6 items-center gap-1.5 bg-[#0c0b0d] px-2 py-0.5 text-[min(3.4cqh,3.6cqw)] font-black whitespace-nowrap text-[#f6f1e7] shadow-[3px_3px_0_#f6f1e7]">
                <MotifIcon m={crew.motif} className="size-[1.1em] text-[#e3141e]" />
                {crew.name}のとどめ
                <span className="font-mono text-[0.7em] tracking-widest text-[#e3141e]">{crew.en}</span>
              </span>
              <div className="aof-fword relative">
                <div data-a="brush" className="absolute top-[18%] left-[-8%] h-[86%] w-[116%] origin-left">
                  <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="size-full">
                    <path d="M4 34C30 18 70 12 120 14C170 16 230 8 286 10C300 10 312 14 318 20L314 26C290 30 300 36 316 40L304 46C250 50 180 48 120 50C80 52 40 54 10 50C20 46 6 42 4 34Z" fill={BLACK} />
                    <path d="M30 55C80 58 150 57 210 55M60 6C120 3 190 2 250 4" stroke={BLACK} strokeWidth="2.5" fill="none" />
                  </svg>
                </div>
                <h3 className="relative origin-left -rotate-[7deg]">
                  <Cut key={crew.word} text={crew.word} attr="fWordL" shadow={BLACK} />
                </h3>
              </div>
              <span
                data-a="sFinish"
                className="font-['Space_Grotesk'] text-[min(11cqh,8cqw)] leading-none font-bold tracking-tighter text-[#f6f1e7] italic"
                style={{ textShadow: `0.05em 0.05em 0 ${BLACK}`, rotate: '-7deg' }}
              >
                FINISH!!
              </span>
            </div>
          </div>
          {/* インパクトコマ(白地に黒の反転シルエット) */}
          <div data-a="impact" className="invisible absolute inset-0 opacity-0" style={{ background: WHITE }}>
            <svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
              {SPEED_LINES.map((l, i) => (
                <polygon key={i} points={l.pts} fill={BLACK} />
              ))}
            </svg>
            <div className="aof-schar absolute">
              <div data-a="impactFig" className="size-full origin-bottom">
                <svg viewBox={FIG_VIEW} className="size-full overflow-visible">
                  <Figure who={fin} pose={crew.finish} flat={BLACK} />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── リザルト ───── */}
      <div data-a="resultsFade" className="pointer-events-none absolute inset-0 z-40">
        <div data-a="results" className="invisible absolute inset-0 opacity-0">
          <div data-a="resShake" className="aof-res absolute">
            <div data-a="resSliver" className="aof-panel aof-sliver absolute inset-0 bg-[#f6f1e7]" />
            <div data-a="resPanel" className="aof-panel absolute inset-0 overflow-hidden bg-[#0c0b0d]">
              <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: 'repeating-linear-gradient(-62deg, transparent 0 20px, rgba(227,20,30,.12) 20px 23px)' }} />
              <div className="aof-pad relative flex h-full flex-col justify-center gap-[min(2.2cqh,1.6cqw)]">
                <div data-a="resRow" className="flex items-center gap-2">
                  <span className="-skew-x-12 bg-[#e3141e] px-1.5 font-mono text-[10px] font-bold tracking-[.3em] text-[#0c0b0d]">RESULT</span>
                  <span className="text-[min(4cqh,4cqw)] font-black tracking-wider">戦闘結果</span>
                </div>
                <div data-a="resRow" className="flex flex-col">
                  <span className="w-fit -rotate-3 bg-[#f6f1e7] px-1.5 text-[min(2.8cqh,3.2cqw)] font-black text-[#0c0b0d]">総ダメージ</span>
                  <span data-a="total" className="aof-total font-['Space_Grotesk'] leading-[1.05] font-bold tracking-tight tabular-nums italic" style={{ textShadow: `0.06em 0.06em 0 ${RED}` }}>
                    0
                  </span>
                </div>
                <ul className="flex flex-col gap-[min(1.2cqh,1cqw)]">
                  {CREW.map((c, i) => (
                    <li key={c.name} data-a="resRow" className="grid grid-cols-[4.6em_minmax(0,1fr)_4.4em] items-center gap-2 text-[min(3cqh,3.4cqw)] font-black">
                      <span className={`flex items-center gap-1 ${i === fin ? 'text-[#e3141e]' : ''}`}>
                        <MotifIcon m={c.motif} className="size-[0.9em] shrink-0" />
                        {c.name}
                      </span>
                      <span className="relative h-[0.55em] -skew-x-[30deg] bg-[#f6f1e7]/15">
                        <span data-a="bar" className={`absolute inset-0 origin-left ${i === fin ? 'bg-[#e3141e]' : 'bg-[#f6f1e7]'}`} />
                      </span>
                      <span className="text-right font-mono tabular-nums">
                        <span data-a="rowDmg">0</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div data-a="resRow" className="flex flex-wrap gap-x-3 gap-y-1 text-[min(2.6cqh,3cqw)] font-bold text-[#f6f1e7]/85">
                  <span>
                    <span className="text-[#e3141e]">◆</span> 影もどき ×3
                  </span>
                  <span>
                    経験値 <span className="font-mono">+1,280</span>
                  </span>
                  <span>
                    <span className="text-[#e3141e]">¥</span> <span className="font-mono">9,600</span>
                  </span>
                </div>
              </div>
            </div>
            <div data-a="stamp" className="aof-stamp invisible absolute aspect-square opacity-0">
              <div data-a="stampRing" className="absolute inset-0 rounded-full border-4 border-[#e3141e] opacity-0" />
              <svg viewBox="0 0 120 120" className="size-full overflow-visible">
                <g filter={`url(#${fStamp})`}>
                  <circle cx="60" cy="60" r="54" fill="rgba(12,11,13,.55)" stroke={RED} strokeWidth="7" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke={RED} strokeWidth="2" />
                  <text x="60" y="73" textAnchor="middle" fontSize="38" fontWeight="900" fill={RED} fontFamily="'Noto Sans JP', sans-serif">
                    撃破
                  </text>
                  <text x="60" y="94" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="3" fill={RED} fontFamily="'Space Grotesk', sans-serif">
                    DEFEATED
                  </text>
                  <path d={STAR_D} transform="translate(53 22) scale(0.6)" fill={RED} />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 白フラッシュ */}
      <div data-a="flash" className="pointer-events-none invisible absolute inset-0 z-50 opacity-0" style={{ background: WHITE }} aria-hidden />

      {/* ───── 待機中の HUD ───── */}
      <div
        className={`aof-hud aof-ui pointer-events-none absolute top-3 left-3 z-20 flex flex-col items-start gap-1 transition-opacity duration-200 @min-[40rem]:top-4 @min-[40rem]:left-5 ${running ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className="-rotate-6 bg-[#e3141e] px-2 py-0.5 font-['Orbitron'] text-[11px] font-black tracking-[.3em] text-[#0c0b0d] ring-2 ring-[#0c0b0d]">HOLD UP</span>
        <h2 aria-label="包囲完了" className="origin-left -rotate-[8deg] text-[clamp(24px,min(8.5cqh,11cqw),60px)]">
          <Cut text="包囲完了" seed={5} />
        </h2>
        <p className="-rotate-3 bg-[#0c0b0d] px-2 py-0.5 text-[11px] font-black tracking-wider text-[#f6f1e7] shadow-[3px_3px_0_#e3141e] @min-[40rem]:text-[12px]">
          <span className="mr-1.5 inline-block size-2 rotate-45 bg-[#e3141e] align-middle" />
          影もどき ×3 は戦意を失っている
        </p>
      </div>

      {/* 操作 */}
      <div
        inert={running}
        className={`aof-ui absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-3 pb-[calc(var(--solo-footer-clearance,0px)_+_0.75rem)] transition-opacity duration-200 @min-[40rem]:px-5 ${running ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <div role="group" aria-label="とどめを刺す仲間" className="flex flex-wrap items-center gap-1.5">
            <span className="hidden -skew-x-12 bg-[#e3141e] px-1.5 py-0.5 text-[10px] font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d] @min-[40rem]:inline">とどめ役</span>
            {CREW.map((c, i) => {
              const h = c.idle.head
              const on = fin === i
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${c.name}(${c.role})にとどめを任せる`}
                  onClick={() => {
                    finRef.current = i
                    setFin(i)
                  }}
                  className={`flex -skew-x-12 items-center gap-1 py-0.5 pr-2 pl-0.5 text-[11px] font-black transition-[background-color,color,translate] duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d] @min-[40rem]:text-xs ${
                    on ? '-translate-y-0.5 bg-[#f6f1e7] text-[#0c0b0d] shadow-[3px_3px_0_#e3141e]' : 'bg-[#0c0b0d] text-[#f6f1e7]/80 ring-1 ring-[#f6f1e7]/30 hover:text-[#f6f1e7]'
                  }`}
                >
                  <span className={`grid size-6 skew-x-12 place-items-center overflow-hidden ${on ? 'bg-[#e3141e]' : 'bg-[#f6f1e7]/15'}`}>
                    <svg viewBox={`${h[0] - 20} ${h[1] - 22} 40 40`} className="size-full" aria-hidden>
                      <Figure who={i} pose={c.idle} />
                    </svg>
                  </span>
                  <span className="inline-block skew-x-12">{c.name}</span>
                  <MotifIcon m={c.motif} className={`size-3 skew-x-12 ${on ? 'text-[#e3141e]' : 'text-[#f6f1e7]/50'}`} />
                </button>
              )
            })}
          </div>
          <div role="group" aria-label="再生速度" className="flex flex-wrap items-center gap-1.5">
            <span className="-skew-x-12 bg-[#f6f1e7] px-1.5 py-0.5 text-[10px] font-black text-[#0c0b0d]">速度</span>
            {[
              { v: false, label: '通常' },
              { v: true, label: 'スロー' },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                aria-pressed={slow === s.v}
                onClick={() => {
                  slowRef.current = s.v
                  setSlow(s.v)
                }}
                className={`-skew-x-12 px-2 py-0.5 text-[11px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#f6f1e7] ${
                  slow === s.v ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#0c0b0d] text-[#f6f1e7]/75 ring-1 ring-[#f6f1e7]/30 hover:text-[#f6f1e7]'
                }`}
              >
                <span className="inline-block skew-x-12">{s.label}</span>
              </button>
            ))}
            <span className="ml-1 hidden items-center gap-1 font-mono text-[10px] font-bold text-[#f6f1e7]/80 @min-[44rem]:flex">
              <kbd className="-skew-x-12 bg-[#f6f1e7] px-1 text-[#0c0b0d]">Enter</kbd>総攻撃
              <kbd className="ml-1.5 -skew-x-12 bg-[#f6f1e7] px-1 text-[#0c0b0d]">Esc</kbd>スキップ
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={start}
          aria-label="総攻撃を仕掛ける(Enter)"
          className="group relative shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f6f1e7]"
          style={reduced ? undefined : { animation: 'aof-pulse .9s ease-in-out infinite' }}
        >
          <span aria-hidden className="absolute inset-0 bg-[#e3141e]" style={{ clipPath: GO_CLIP, animation: 'aof-ring 1.1s ease-out infinite' }} />
          <span aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] bg-[#f6f1e7]" style={{ clipPath: GO_CLIP }} />
          <span
            className="relative flex items-center gap-2 bg-[#e3141e] py-2 pr-5 pl-6 text-[#f6f1e7] transition-colors duration-100 group-hover:bg-[#0c0b0d] @min-[40rem]:py-2.5 @min-[40rem]:pr-7 @min-[40rem]:pl-8"
            style={{ clipPath: GO_CLIP }}
          >
            <span className="-rotate-6 text-[clamp(24px,min(7cqh,4.2cqw),44px)] leading-none font-black tracking-tight italic [text-shadow:3px_3px_0_#0c0b0d]">総攻撃</span>
            <span className="flex flex-col items-start gap-0.5 leading-none">
              <span className="font-['Orbitron'] text-[9px] font-black tracking-[.2em]">ALL-OUT</span>
              <span className="-skew-x-12 bg-[#0c0b0d] px-1 font-mono text-[9px] font-bold">Enter ▶</span>
            </span>
          </span>
        </button>
      </div>

      {/* 演出中の操作 */}
      {running && (
        <div className="aof-ui absolute bottom-[calc(var(--solo-footer-clearance,0px)_+_0.75rem)] left-3 z-[60] flex items-center gap-2 @min-[40rem]:left-5">
          {slow && <span className="-skew-x-12 bg-[#f6f1e7] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0c0b0d]">スロー ×{SLOW}</span>}
          <button
            type="button"
            onClick={skip}
            className="-skew-x-12 bg-[#0c0b0d] px-3 py-1 text-[11px] font-black text-[#f6f1e7] shadow-[3px_3px_0_#e3141e] ring-2 ring-[#f6f1e7] outline-none hover:bg-[#e3141e] focus-visible:ring-[#e3141e]"
          >
            <span className="inline-block skew-x-12">
              スキップ <span className="font-mono text-[9px] opacity-70">Esc</span>
            </span>
          </button>
        </div>
      )}

      <p ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  )
}
