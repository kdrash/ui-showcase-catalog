/**
 * ノベルゲーム（ADV）風の会話画面。
 * - 空と海は React Three Fiber + GLSL のフルスクリーンシェーダー（fbm の雲、星、沈む太陽、波と海面のきらめき、玉ボケ）。
 *   物語の進行に合わせて日が沈み、選択時はシェーダーと光のにじみでトランジション。前景の駅舎・街並みは SVG で座標を一致させて重ねる
 * - ポインター位置による視差（空・人物・手前の光の粒で移動量を変える）とフィルムグレイン
 * - オリジナルの立ち絵2人を SVG で描き、表情（通常/笑顔/驚き/悲しみ/むくれ/照れ）・まばたき・口パクを切り替え
 *   話者は明るく前に、それ以外は暗くする。位置（左・中央・右）は motion で補間
 * - 半透明のテキスト窓 + 名前枠、句読点で間を取るタイプライター。クリックで全文表示→もう一度で次へ
 * - オート / スキップ / ログ / 非表示（右クリックでも非表示）、選択肢でルート分岐、分岐先で背景演出（照明・電車）
 * - キー操作はデモのルート要素だけで受け取る（Enter/Space 送り、↑↓ 選択、L ログ、H 非表示、A オート、S スキップ、Esc 戻る）
 */
import { AnimatePresence, motion, useAnimate, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FastForward, History, EyeOff, Play, RotateCcw, X } from 'lucide-react'

type Face = 'normal' | 'smile' | 'surprise' | 'sad' | 'pout' | 'blush'
type CharId = 'nagi' | 'sora'
type Pos = 'left' | 'center' | 'right' | 'off'
type Speaker = 'ナギ' | 'ソラ' | 'ハル'

interface Cast {
  pos: Pos
  face: Face
}
interface Stage {
  nagi: Cast
  sora: Cast
  lights: boolean
  train: boolean
}
interface Line {
  speaker?: Speaker
  text: string
  stage?: { nagi?: Partial<Cast>; sora?: Partial<Cast>; lights?: boolean; train?: boolean }
  next?: string
  choice?: { label: string; next: string }[]
  end?: string
}

const SCRIPT: Record<string, Line> = {
  s1: { text: '夕凪駅のホームに、発車まであと十分を知らせるチャイムが鳴った。', stage: { nagi: { pos: 'center', face: 'normal' } }, next: 's2' },
  s2: { speaker: 'ナギ', text: '「あ、やっと来た。もう、五分も遅刻だよ？」', stage: { nagi: { face: 'pout' } }, next: 's3' },
  s3: { speaker: 'ハル', text: '「ごめん。坂の上から見た空が、あんまり赤かったから」', stage: { nagi: { face: 'normal' } }, next: 's4' },
  s4: { speaker: 'ナギ', text: '「……それ、言い訳になってないからね」', stage: { nagi: { face: 'smile' } }, next: 's5' },
  s5: { text: 'ナギは笑いながら、ベンチに置いていた紙袋をひょいと持ち上げた。', next: 's6' },
  s6: { speaker: 'ソラ', text: '「おーい、二人とも！ 間に合ったー？」', stage: { nagi: { pos: 'left', face: 'normal' }, sora: { pos: 'right', face: 'smile' } }, next: 's7' },
  s7: { speaker: 'ナギ', text: '「ソラ先輩!? 部活はどうしたんですか」', stage: { nagi: { face: 'surprise' } }, next: 's8' },
  s8: { speaker: 'ソラ', text: '「抜けてきた。後輩の見送りくらい、させてよね」', stage: { sora: { face: 'smile' }, nagi: { face: 'normal' } }, next: 's9' },
  s9: { speaker: 'ナギ', text: '「……見送り、かあ。明日の朝には、もうこの街にいないんだもんね」', stage: { nagi: { face: 'sad' }, sora: { face: 'normal' } }, next: 's10' },
  s10: {
    text: '電車が来るまで、あと三分。言いたいことは、たぶん一つだけだった。',
    choice: [
      { label: '「また会おう」と約束する', next: 'a1' },
      { label: '「行かないで」と伝える', next: 'b1' },
    ],
  },
  a1: { speaker: 'ハル', text: '「夏休みになったら、会いに行くよ。絶対に」', stage: { nagi: { face: 'surprise' } }, next: 'a2' },
  a2: { speaker: 'ナギ', text: '「……うん。じゃあそれまで、この景色、ちゃんと覚えておいてね」', stage: { nagi: { face: 'blush' } }, next: 'a3' },
  a3: { speaker: 'ソラ', text: '「はいはい、青春だねえ。ほら並んで、写真撮るよ！」', stage: { sora: { face: 'smile' }, nagi: { face: 'smile' } }, next: 'a4' },
  a4: { text: 'シャッターの音と同時に、ホームの灯りがいっせいに点いた。', stage: { lights: true }, end: 'ルートA「夕凪の約束」' },
  b1: { speaker: 'ハル', text: '「……行かないでほしい、って言ったら、困る？」', stage: { nagi: { face: 'surprise' }, sora: { face: 'surprise' } }, next: 'b2' },
  b2: { speaker: 'ナギ', text: '「困るよ。……困るけど、ちょっとだけ、うれしい」', stage: { nagi: { face: 'blush' } }, next: 'b3' },
  b3: { speaker: 'ソラ', text: '「（……あー、これは先輩、少し離れてたほうがいいやつだ）」', stage: { sora: { face: 'pout' } }, next: 'b4' },
  b4: {
    text: '到着した電車の扉が開いて、閉じて――ナギは、まだホームに立っていた。',
    stage: { sora: { pos: 'off' }, nagi: { pos: 'center', face: 'smile' }, train: true },
    end: 'ルートB「乗り過ごした夕暮れ」',
  },
}

const INITIAL_STAGE: Stage = { nagi: { pos: 'off', face: 'normal' }, sora: { pos: 'off', face: 'normal' }, lights: false, train: false }
const POS_LEFT: Record<Pos, string> = { left: '27%', center: '50%', right: '73%', off: '50%' }
const SPEAKER_INFO: Record<Speaker, { color: string; roman: string; char?: CharId }> = {
  ナギ: { color: '#ff9fb6', roman: 'NAGI', char: 'nagi' },
  ソラ: { color: '#7fd0ff', roman: 'SORA', char: 'sora' },
  ハル: { color: '#ffd27a', roman: 'HARU' },
}

function applyStage(stage: Stage, line: Line): Stage {
  const p = line.stage
  if (!p) return stage
  return {
    nagi: { ...stage.nagi, ...p.nagi },
    sora: { ...stage.sora, ...p.sora },
    lights: p.lights ?? stage.lights,
    train: p.train ?? stage.train,
  }
}

/* ------------------------------------------------------------------ */
/* background                                                          */
/* ------------------------------------------------------------------ */

const CITY = (() => {
  const out: { x: number; w: number; h: number; win: [number, number][] }[] = []
  let s = 11
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280
  let x = -10
  while (x < 1610) {
    const w = 22 + r() * 46
    const h = 12 + r() * 58
    const win: [number, number][] = []
    for (let i = 0; i < 3; i++) if (r() > 0.45) win.push([x + 5 + r() * (w - 12), 636 - h + 6 + r() * (h - 12)])
    out.push({ x, w, h, win })
    x += w + 1 + r() * 4
  }
  return out
})()

const MOTES = Array.from({ length: 16 }, (_, i) => ({ left: (i * 37 + 11) % 100, top: 14 + ((i * 53) % 66), d: 7 + (i % 5) * 1.7, size: 3 + (i % 4) * 2.2, blur: i % 3 === 0 }))

/**
 * 空と海のフラグメントシェーダー。SVG の前景（viewBox 1600×900, xMidYMax slice）と
 * 同じ座標系に変換して、水平線・太陽の位置を前景とぴったり合わせる。
 */
const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }
`
const SKY_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uDusk;
uniform float uFlash;
uniform vec2 uPar;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 px = vUv * uRes;
  float sc = max(uRes.x / 1600.0, uRes.y / 900.0);
  float X = (px.x - (uRes.x - 1600.0 * sc) * 0.5) / sc;
  float Y = 900.0 - px.y / sc;
  const float H = 634.0;
  vec2 sun = vec2(1080.0 + uPar.x * 14.0, mix(588.0, 652.0, uDusk));
  vec3 hor = mix(vec3(1.0, 0.80, 0.52), vec3(1.0, 0.56, 0.36), uDusk);
  vec3 col;

  if (Y < H) {
    float t = clamp(Y / H, 0.0, 1.0);
    vec3 top = mix(vec3(0.13, 0.11, 0.32), vec3(0.05, 0.05, 0.17), uDusk);
    vec3 mid = mix(vec3(0.40, 0.21, 0.46), vec3(0.24, 0.13, 0.36), uDusk);
    vec3 low = mix(vec3(0.95, 0.44, 0.42), vec3(0.78, 0.30, 0.38), uDusk);
    col = mix(top, mid, smoothstep(0.0, 0.48, t));
    col = mix(col, low, smoothstep(0.42, 0.84, t));
    col = mix(col, hor, smoothstep(0.82, 1.0, t));

    // 星
    vec2 g = floor(vec2(X, Y) / 16.0);
    float h = hash(g);
    if (h > 0.982) {
      vec2 c = (g + 0.5 + (vec2(hash(g + 3.1), hash(g + 7.7)) - 0.5) * 0.6) * 16.0;
      float tw = 0.6 + 0.4 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
      float star = smoothstep(1.6, 0.0, length(vec2(X, Y) - c)) * tw;
      col += vec3(1.0, 0.95, 0.85) * star * (1.0 - smoothstep(0.15, 0.55, t)) * (0.35 + uDusk * 0.9);
    }

    // 太陽のにじみと本体
    float d = length(vec2(X, Y) - sun);
    col += vec3(1.0, 0.58, 0.32) * exp(-d / 300.0) * 0.5;
    col += vec3(1.0, 0.86, 0.62) * exp(-d / 95.0) * 0.55;
    col = mix(col, vec3(1.0, 0.96, 0.84), smoothstep(75.0, 71.0, d));

    // 流れる雲（下側が夕日に照らされる）
    vec2 cp = vec2((X + uPar.x * 26.0) / 640.0 + uTime * 0.008, Y / 46.0);
    float n = fbm(cp);
    float below = fbm(cp + vec2(0.0, 0.22));
    float band = smoothstep(150.0, 300.0, Y) * (1.0 - smoothstep(470.0, 590.0, Y));
    float dens = smoothstep(0.52, 0.74, n) * band;
    float lit = clamp((n - below) * 5.0 + 0.35, 0.0, 1.0);
    float nearSun = exp(-abs(X - sun.x) / 520.0);
    vec3 cloud = mix(mix(vec3(0.36, 0.19, 0.40), vec3(0.24, 0.13, 0.30), uDusk), mix(vec3(1.0, 0.62, 0.48), vec3(1.0, 0.82, 0.6), nearSun), lit * (0.5 + 0.5 * nearSun));
    col = mix(col, cloud, dens * 0.9);
  } else {
    // 海
    float dy = Y - H;
    float depth = clamp(dy / 90.0, 0.0, 1.0);
    vec3 seaTop = mix(vec3(0.86, 0.47, 0.44), vec3(0.62, 0.30, 0.38), uDusk);
    vec3 seaBot = vec3(0.17, 0.10, 0.26);
    col = mix(seaTop, seaBot, pow(depth, 0.55));
    float wave = noise(vec2(X / (18.0 + dy * 2.4), dy / (1.2 + dy * 0.09) - uTime * 0.7));
    col += (wave - 0.5) * 0.08 * (0.4 + depth);
    float spread = 34.0 + dy * 1.7;
    float glint = exp(-pow((X - sun.x) / spread, 2.0));
    float sparkle = pow(noise(vec2(X / 5.0, dy * 1.4 - uTime * 2.6)), 5.0) * 3.0 + pow(noise(vec2(X / 11.0 + 3.0, dy * 0.6 + uTime * 1.3)), 3.0);
    col += vec3(1.0, 0.83, 0.56) * glint * (0.22 + sparkle) * (1.0 - depth * 0.55);
    col += hor * exp(-dy / 10.0) * 0.4;
  }

  // 奥にただよう玉ボケ
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float hx = hash(vec2(fi, 1.3));
    float hy = hash(vec2(fi, 7.9));
    float r = 5.0 + hash(vec2(fi, 4.2)) * 11.0;
    vec2 p = vec2(mod(hx * 1700.0 + uTime * (6.0 + hy * 10.0) + uPar.x * 10.0, 1700.0) - 50.0, 180.0 + hy * 470.0 + sin(uTime * 0.5 + fi) * 14.0);
    float b = smoothstep(r, r * 0.55, length(vec2(X, Y) - p));
    col += vec3(1.0, 0.78, 0.52) * b * 0.16;
  }

  col = mix(col, vec3(1.0, 0.93, 0.84), uFlash);
  col += (hash(px + fract(uTime * 7.0) * 91.0) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}
`

function SkyQuad({ dusk, flashKey, par, reduced }: { dusk: number; flashKey: number; par: RefObject<{ x: number; y: number }>; reduced: boolean }) {
  const { size } = useThree()
  const uniforms = useMemo(
    () => ({ uTime: { value: 3 }, uRes: { value: new THREE.Vector2(1, 1) }, uDusk: { value: dusk }, uFlash: { value: 0 }, uPar: { value: new THREE.Vector2() } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const lastFlash = useRef(flashKey)
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    if (!reduced) uniforms.uTime.value += d
    uniforms.uRes.value.set(size.width, size.height)
    uniforms.uDusk.value += (dusk - uniforms.uDusk.value) * Math.min(1, d * (reduced ? 30 : 0.7))
    if (lastFlash.current !== flashKey) {
      lastFlash.current = flashKey
      uniforms.uFlash.value = reduced ? 0 : 0.85
    }
    uniforms.uFlash.value *= Math.pow(0.15, d)
    const p = par.current
    if (p) uniforms.uPar.value.set(p.x, p.y)
  })
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} uniforms={uniforms} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function StationForeground({ lights, train, reduced }: { lights: boolean; train: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="vn-plat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#57405a" />
          <stop offset="1" stopColor="#1c1526" />
        </linearGradient>
        <radialGradient id="vn-lamp">
          <stop offset="0" stopColor="#ffe9b0" stopOpacity=".95" />
          <stop offset=".35" stopColor="#ffc770" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffb060" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vn-pillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#140e1c" />
          <stop offset=".7" stopColor="#261b30" />
          <stop offset="1" stopColor="#c0705a" />
        </linearGradient>
        <linearGradient id="vn-city" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3260" />
          <stop offset="1" stopColor="#3a2246" />
        </linearGradient>
        <pattern id="vn-dots" width="12" height="14" patternUnits="userSpaceOnUse">
          <rect width="12" height="14" fill="#e3b04a" />
          <circle cx="6" cy="7" r="2.4" fill="#b98522" />
        </pattern>
      </defs>

      {/* 鳥 */}
      <g stroke="#3a2140" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M760 330 q8 -7 16 0 q8 -7 16 0" />
        <path d="M806 356 q6 -5 12 0 q6 -5 12 0" />
      </g>

      {/* 対岸の山と街 */}
      <path d="M0 612 L110 586 L240 600 L360 570 L500 596 L640 582 L780 604 L940 612 L1240 598 L1380 576 L1500 594 L1600 586 L1600 640 L0 640 Z" fill="#6d3a68" opacity=".8" />
      <g fill="url(#vn-city)">
        {CITY.map((b, i) => (
          <rect key={i} x={b.x} y={636 - b.h} width={b.w} height={b.h + 2} />
        ))}
      </g>
      <g fill="#ffd98a">
        {CITY.flatMap((b, i) =>
          b.win.map(([x, y], j) => <rect key={`${i}-${j}`} x={x} y={y} width="3.5" height="3.5" opacity={lights ? 0.95 : 0.6} style={{ transition: 'opacity 1s' }} />),
        )}
      </g>

      {/* 線路 */}
      <rect y="704" width="1600" height="40" fill="#271c31" />
      <path d="M0 716 H1600 M0 732 H1600" stroke="#c48a80" strokeWidth="2.5" opacity=".7" />

      {/* 電車（ルートB） */}
      {train && !reduced && (
        <motion.g initial={{ x: 1900 }} animate={{ x: [1900, 0, 0, -1950] }} transition={{ duration: 7, times: [0, 0.38, 0.62, 1], ease: ['easeOut', 'linear', 'easeIn'] }}>
          <rect x="-120" y="596" width="1840" height="138" rx="22" fill="#ddd6cf" />
          <rect x="-120" y="596" width="1840" height="30" rx="14" fill="#f2ece4" opacity=".6" />
          <rect x="-120" y="690" width="1840" height="12" fill="#3d8db6" />
          <rect x="-120" y="704" width="1840" height="4" fill="#f0a35a" />
          {Array.from({ length: 19 }, (_, i) => (
            <rect key={i} x={-90 + i * 96} y="616" width={i % 4 === 1 ? 44 : 66} height={i % 4 === 1 ? 94 : 50} rx="6" fill={i % 4 === 1 ? '#bcb3ad' : '#ffd38a'} opacity={i % 4 === 1 ? 1 : 0.92} />
          ))}
        </motion.g>
      )}

      {/* 柱と屋根 */}
      <g>
        <rect x="150" y="0" width="36" height="760" fill="url(#vn-pillar)" />
        <rect x="1414" y="0" width="36" height="760" fill="url(#vn-pillar)" />
        <path d="M0 0 H1600 V58 L0 76 Z" fill="#181220" />
        <path d="M0 76 L1600 58" stroke="#ff9a6b" strokeWidth="3" opacity=".45" />
        {[300, 620, 940, 1260].map((x) => (
          <path key={x} d={`M${x} 0 V${72 - (x / 1600) * 18}`} stroke="#2b2236" strokeWidth="10" />
        ))}
      </g>

      {/* 架線 */}
      <path d="M0 236 Q800 300 1600 250" stroke="#1d1526" strokeWidth="2" fill="none" />
      <path d="M0 254 Q800 314 1600 268" stroke="#1d1526" strokeWidth="1.2" fill="none" opacity=".8" />

      {/* 照明 */}
      {[420, 800, 1180].map((x) => (
        <g key={x}>
          <line x1={x} y1={70} x2={x} y2={282} stroke="#2b2236" strokeWidth="3" />
          <path d={`M${x - 40} 292 L${x - 30} 282 H${x + 30} L${x + 40} 292 Z`} fill="#2b2236" />
          <rect x={x - 34} y={292} width="68" height="7" rx="3" fill={lights ? '#fff4d0' : '#6a5a6e'} style={{ transition: 'fill .4s' }} />
          <circle cx={x} cy={310} r="200" fill="url(#vn-lamp)" style={{ opacity: lights ? 1 : 0, transition: 'opacity .8s' }} />
        </g>
      ))}

      {/* 駅名標 */}
      <g transform="translate(250 360)">
        <line x1="40" y1="0" x2="40" y2="-290" stroke="#2b2236" strokeWidth="4" />
        <line x1="290" y1="0" x2="290" y2="-290" stroke="#2b2236" strokeWidth="4" />
        <rect x="0" y="0" width="330" height="96" rx="6" fill="#f5f1e8" stroke="#1d2a4a" strokeWidth="5" />
        <rect x="0" y="62" width="330" height="10" fill="#2f7fb3" />
        <text x="165" y="44" textAnchor="middle" fontFamily="'Noto Sans JP', sans-serif" fontWeight="900" fontSize="34" fill="#1d2a4a" letterSpacing="10">
          ゆうなぎ
        </text>
        <text x="165" y="88" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="13" fill="#1d2a4a" letterSpacing="5">
          YUNAGI
        </text>
        <text x="14" y="88" fontFamily="'Noto Sans JP', sans-serif" fontWeight="700" fontSize="11" fill="#4a5674">
          ← しおかぜ
        </text>
        <text x="316" y="88" textAnchor="end" fontFamily="'Noto Sans JP', sans-serif" fontWeight="700" fontSize="11" fill="#4a5674">
          みさき →
        </text>
        <rect x="0" y="0" width="330" height="96" rx="6" fill="#ff9a6b" opacity=".12" />
      </g>

      {/* ホーム */}
      <rect y="742" width="1600" height="158" fill="url(#vn-plat)" />
      <rect y="738" width="1600" height="9" fill="#efdcbc" />
      <rect y="756" width="1600" height="14" fill="url(#vn-dots)" />
      <rect y="738" width="1600" height="40" fill="#ff9a6b" opacity=".08" />
      {lights && [420, 800, 1180].map((x) => <ellipse key={x} cx={x} cy={820} rx="220" ry="40" fill="#ffd38a" opacity=".18" />)}
      {/* ベンチ */}
      <g fill="#2a1f30">
        <rect x="1220" y="770" width="200" height="12" rx="3" />
        <rect x="1220" y="742" width="200" height="10" rx="3" />
        <rect x="1236" y="782" width="10" height="40" />
        <rect x="1394" y="782" width="10" height="40" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* characters                                                          */
/* ------------------------------------------------------------------ */

const LINE = '#3a2532'

interface Palette {
  hair: string
  hairDark: string
  hairLight: string
  hairRing: string
  irisTop: string
  irisBottom: string
  pupil: string
  skin: string
  skinShade: string
  skinDeep: string
}

const PALETTES: Record<CharId, Palette> = {
  nagi: { hair: '#2e3160', hairDark: '#1b1c3d', hairLight: '#4b52a0', hairRing: '#a3abeb', irisTop: '#35246a', irisBottom: '#a88af0', pupil: '#1b1036', skin: '#ffeadf', skinShade: '#f6cbbb', skinDeep: '#e8a796' },
  sora: { hair: '#6e2f2d', hairDark: '#471c1d', hairLight: '#a24c40', hairRing: '#f2ad8a', irisTop: '#173f4c', irisBottom: '#5fd0d4', pupil: '#0d2229', skin: '#ffe6d6', skinShade: '#f3c4b1', skinDeep: '#e4a08e' },
}

function Eye({ cx, cy, s, face, blink, sharp, uid, pal }: { cx: number; cy: number; s: 1 | -1; face: Face; blink: boolean; sharp: boolean; uid: string; pal: Palette }) {
  const P = (dx: number, dy: number) => `${cx + s * dx} ${cy + dy}`
  if (face === 'smile') {
    return (
      <g fill="none" stroke={LINE} strokeLinecap="round">
        <path d={`M${P(-11, 3)} Q${P(0, -9)} ${P(11, 3)}`} strokeWidth="3.4" />
        <path d={`M${P(11, 3)} L${P(14.5, 0.5)}`} strokeWidth="2" />
      </g>
    )
  }
  if (blink) {
    return (
      <g fill="none" stroke={LINE} strokeLinecap="round">
        <path d={`M${P(-11, 1)} Q${P(0, 6.5)} ${P(11, 1)}`} strokeWidth="3" />
        <path d={`M${P(11, 1)} L${P(14.5, -1)}`} strokeWidth="2" />
      </g>
    )
  }
  const lid = face === 'pout' ? 5.5 : face === 'sad' ? 3.5 : face === 'surprise' ? -2.5 : 0
  const top = sharp ? -11 : -12.5
  const white = `M${P(-11, -2 + lid * 0.6)} C${P(-8, top + lid)} ${P(6, top - 1 + lid)} ${P(11.5, -6 + lid)} C${P(13, 2)} ${P(9, 10.5)} ${P(1, 11)} C${P(-6, 11)} ${P(-11, 5)} ${P(-11, -2 + lid * 0.6)} Z`
  const big = face === 'surprise'
  const look = face === 'blush' ? -3.2 : 0
  const ix = cx + look
  const irx = big ? 6.2 : 7.6
  const iry = big ? 8.2 : sharp ? 9 : 9.8
  const clip = `${uid}-eye${s}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={white} />
        </clipPath>
      </defs>
      <path d={white} fill="#ffffff" />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={ix} cy={cy + 2} rx={irx} ry={iry} fill={`url(#${uid}-iris)`} stroke={pal.pupil} strokeWidth="0.9" />
        <ellipse cx={ix} cy={cy + 3.4} rx={big ? 2.4 : 3.4} ry={big ? 3.2 : 4.6} fill={pal.pupil} />
        <ellipse cx={ix} cy={cy + 7.5} rx={irx * 0.62} ry="2.6" fill={pal.irisBottom} opacity=".55" />
        <path d={`M${P(-12, -4 + lid)} C${P(-8, top + lid)} ${P(6, top - 1 + lid)} ${P(12, -6 + lid)} L${P(12, -1 + lid)} C${P(6, -7 + lid)} ${P(-6, -7 + lid)} ${P(-12, 1 + lid)} Z`} fill={pal.pupil} opacity=".28" />
        <ellipse cx={ix + 3.3} cy={cy - 2.6} rx={big ? 2.2 : 2.9} ry={big ? 2.7 : 3.5} fill="#ffffff" />
        <circle cx={ix - 3} cy={cy + 6.2} r="1.3" fill="#ffffff" opacity=".9" />
      </g>
      <path
        d={`M${P(-12.5, -1 + lid * 0.6)} C${P(-9, top - 1 + lid)} ${P(6, top - 3 + lid)} ${P(12, -7 + lid)} L${P(sharp ? 17.5 : 15.5, sharp ? -11.5 : -9.5)} L${P(13.2, -3.5 + lid * 0.5)} C${P(7, top + 1.5 + lid)} ${P(-6, top + 2 + lid)} ${P(-10.5, 1.5 + lid * 0.6)} Z`}
        fill={LINE}
      />
      <path d={`M${P(-3, 11.2)} Q${P(5, 11)} ${P(10, 7)}`} stroke={LINE} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".6" />
    </g>
  )
}

function Face({ face, blink, mouthOpen, sharp, uid, pal }: { face: Face; blink: boolean; mouthOpen: boolean; sharp: boolean; uid: string; pal: Palette }) {
  const brow = (s: 1 | -1) => {
    const cx = s === 1 ? 138 : 102
    const P = (dx: number, dy: number) => `${cx + s * dx} ${122 + dy}`
    const shapes: Record<Face, string> = {
      normal: `M${P(-9, -19)} Q${P(1, -23)} ${P(11, -19)}`,
      smile: `M${P(-9, -20)} Q${P(1, -25)} ${P(11, -20.5)}`,
      surprise: `M${P(-9, -24)} Q${P(1, -29)} ${P(11, -24.5)}`,
      sad: `M${P(-9, -24)} Q${P(1, -21.5)} ${P(11, -18)}`,
      pout: `M${P(-9, -16.5)} Q${P(1, -19)} ${P(11, -22)}`,
      blush: `M${P(-9, -21.5)} Q${P(1, -23)} ${P(11, -19)}`,
    }
    return <path d={shapes[face]} stroke={pal.hairDark} strokeWidth="2.3" fill="none" strokeLinecap="round" />
  }
  const mouth = () => {
    if (mouthOpen) {
      const wide = face === 'smile' || face === 'blush'
      return (
        <g>
          <path d={wide ? 'M114 148.5 Q120 158 126 148.5 Q120 150.5 114 148.5 Z' : 'M116.5 148.5 Q120 156 123.5 148.5 Q120 149.6 116.5 148.5 Z'} fill="#b8475a" stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />
          <ellipse cx="120" cy={wide ? 153.5 : 152.5} rx={wide ? 3.4 : 2.2} ry="1.5" fill="#ff8d9b" />
        </g>
      )
    }
    switch (face) {
      case 'smile':
        return (
          <g>
            <path d="M112.5 147.5 Q120 158.5 127.5 147.5 Q120 150 112.5 147.5 Z" fill="#b8475a" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
            <ellipse cx="120" cy="153.5" rx="3.6" ry="1.6" fill="#ff8d9b" />
          </g>
        )
      case 'surprise':
        return <ellipse cx="120" cy="152" rx="3.2" ry="4.2" fill="#b8475a" stroke={LINE} strokeWidth="1.1" />
      case 'sad':
        return <path d="M115.5 153 Q120 149.5 124.5 153" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      case 'pout':
        return <path d="M114.5 151 q2.75 -2.3 5.5 0 q2.75 2.3 5.5 0" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      case 'blush':
        return <path d="M116 150 Q120 153.4 124 150" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      default:
        return <path d="M115.5 150 Q120 152.6 124.5 150" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    }
  }
  const cheeks = face === 'smile' || face === 'blush' || face === 'pout' ? (face === 'blush' ? 1 : 0.6) : 0.25
  return (
    <g>
      <g opacity={cheeks}>
        <ellipse cx="95" cy="139" rx="11" ry="5.5" fill={`url(#${uid}-cheek)`} />
        <ellipse cx="145" cy="139" rx="11" ry="5.5" fill={`url(#${uid}-cheek)`} />
      </g>
      {face === 'blush' && (
        <path d="M89 141 l3 -5 M94 141 l3 -5 M99 141 l3 -5 M139 141 l3 -5 M144 141 l3 -5 M149 141 l3 -5" stroke="#e46d86" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
      )}
      <Eye cx={102} cy={122} s={-1} face={face} blink={blink} sharp={sharp} uid={uid} pal={pal} />
      <Eye cx={138} cy={122} s={1} face={face} blink={blink} sharp={sharp} uid={uid} pal={pal} />
      {brow(-1)}
      {brow(1)}
      <path d="M119.5 138 L121.5 141.5" stroke={pal.skinDeep} strokeWidth="1.6" strokeLinecap="round" />
      {mouth()}
      {face === 'surprise' && <path d="M162 96 c3 5 5 8.5 3 11.5 a3.2 3.2 0 0 1 -5.4 -2.2 c0 -3 1.2 -5.2 2.4 -9.3z" fill="#cdeeff" stroke="#6a9cc0" strokeWidth="1" />}
      {face === 'pout' && <path d="M158 80 l6 -6 m-2 8.5 l7.5 -3 m-9.5 -3 l1 -8.5" stroke="#e0607e" strokeWidth="2.2" strokeLinecap="round" />}
    </g>
  )
}

function Character({ id, face, talking, reduced }: { id: CharId; face: Face; talking: boolean; reduced: boolean }) {
  const [blink, setBlink] = useState(false)
  const [flap, setFlap] = useState(false)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  useEffect(() => {
    if (reduced) return
    let t = 0
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        t = window.setTimeout(() => {
          setBlink(false)
          loop()
        }, 120)
      }, 2200 + Math.random() * 2800)
    }
    loop()
    return () => window.clearTimeout(t)
  }, [reduced])

  useEffect(() => {
    if (!talking || reduced) return
    const i = window.setInterval(() => setFlap((m) => !m), 105)
    return () => window.clearInterval(i)
  }, [talking, reduced])

  const nagi = id === 'nagi'
  const pal = PALETTES[id]
  const outline = { stroke: LINE, strokeWidth: 1.7, strokeLinejoin: 'round' as const }
  const rim = '#ffc39a'

  return (
    <svg viewBox="0 0 240 480" className="h-full w-full [filter:drop-shadow(0_14px_24px_rgba(20,10,40,.5))]" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.hairLight} />
          <stop offset=".45" stopColor={pal.hair} />
          <stop offset="1" stopColor={pal.hairDark} />
        </linearGradient>
        <linearGradient id={`${uid}-iris`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.irisTop} />
          <stop offset=".55" stopColor={pal.irisTop} />
          <stop offset="1" stopColor={pal.irisBottom} />
        </linearGradient>
        <radialGradient id={`${uid}-cheek`}>
          <stop offset="0" stopColor="#ff7f9a" stopOpacity=".75" />
          <stop offset="1" stopColor="#ff7f9a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset=".7" stopColor={rim} stopOpacity="0" />
          <stop offset="1" stopColor={rim} stopOpacity=".55" />
        </linearGradient>
      </defs>

      {/* 後ろ髪 */}
      {nagi ? (
        <path d="M64 112 C58 54 92 30 122 30 C156 30 186 56 178 112 C176 140 172 164 164 182 L152 174 L142 184 L100 184 L88 174 L76 182 C68 164 64 140 64 112 Z" fill={pal.hairDark} {...outline} />
      ) : (
        <>
          <path d="M146 54 C198 40 226 102 214 172 C208 214 190 246 170 268 C180 228 188 188 178 152 C172 122 160 98 148 82 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M160 72 C192 92 202 152 188 220 C194 160 184 112 160 72 Z" fill={pal.hairDark} opacity=".8" />
          <path d="M176 92 C196 120 198 160 192 196" stroke={pal.hairRing} strokeWidth="2.5" fill="none" opacity=".5" strokeLinecap="round" />
          <path d="M66 112 C62 58 94 34 122 34 C152 34 180 58 176 112 L170 152 L74 152 Z" fill={pal.hairDark} {...outline} />
        </>
      )}

      {/* 脚・スカート（下はテキスト窓に隠れることが多い） */}
      <rect x="94" y="404" width="18" height="76" fill={pal.skin} />
      <rect x="128" y="404" width="18" height="76" fill={pal.skin} />
      <rect x="92" y="448" width="22" height="32" fill={nagi ? '#2b2f45' : '#f2f2f2'} />
      <rect x="126" y="448" width="22" height="32" fill={nagi ? '#2b2f45' : '#f2f2f2'} />
      <path d="M70 306 L170 306 L192 412 C160 422 80 422 48 412 Z" fill={nagi ? '#384468' : '#283048'} {...outline} />
      <path d="M70 306 L48 412 C60 416 70 418 82 419 L96 310 Z" fill={nagi ? '#283252' : '#1c2236'} />
      <path d="M96 310 L84 418 M120 310 L120 422 M144 310 L156 418" stroke={nagi ? '#253050' : '#161b2c'} strokeWidth="2" />

      {/* 首 */}
      <path d="M109 156 L131 156 L133 196 L107 196 Z" fill={pal.skin} {...outline} />
      <path d="M108 160 C114 174 126 174 132 160 L133 180 C124 188 116 188 107 180 Z" fill={pal.skinDeep} opacity=".7" />

      {/* 腕 */}
      {[1, -1].map((s) => {
        const P = (x: number, y: number) => `${120 + s * (x - 120)} ${y}`
        return (
          <g key={s}>
            <path d={`M${P(72, 206)} C${P(60, 240)} ${P(56, 280)} ${P(60, 320)} L${P(80, 322)} C${P(80, 288)} ${P(84, 252)} ${P(92, 226)} Z`} fill={nagi ? '#ecdbbb' : '#2a6b90'} {...outline} />
            {!nagi && <path d={`M${P(66, 218)} C${P(58, 250)} ${P(57, 284)} ${P(61, 316)}`} stroke="#f2f7fa" strokeWidth="3.4" fill="none" />}
            <ellipse cx={120 + s * (70 - 120)} cy="327" rx="10" ry="11" fill={pal.skin} {...outline} />
          </g>
        )
      })}
      <path d="M72 206 C60 240 56 280 60 320 L70 321 C68 286 70 248 80 214 Z" fill={nagi ? '#d3bd95' : '#1f5677'} />

      {/* 胴 */}
      <path d="M72 208 C80 192 100 186 120 186 C140 186 160 192 168 208 L178 308 C170 326 70 326 62 308 Z" fill={nagi ? '#f2e3c6' : '#2f78a0'} {...outline} />
      <path d="M72 208 C80 192 94 188 104 188 L96 246 C90 276 80 300 64 312 Z" fill={nagi ? '#dcc59e' : '#235f82'} />
      <path d="M168 208 L178 308 C175 314 170 318 164 320 L170 300 L162 214 Z" fill={`url(#${uid}-rim)`} />
      {nagi ? (
        <>
          <path d="M104 188 L120 240 L136 188 Z" fill="#fffaf3" {...outline} />
          <path d="M104 188 L95 204 L116 216 Z M136 188 L145 204 L124 216 Z" fill="#ffffff" {...outline} />
          <path d="M120 206 C112 198 102 202 105 211 C107 218 114 216 120 210 Z M120 206 C128 198 138 202 135 211 C133 218 126 216 120 210 Z" fill="#e05a6c" {...outline} strokeWidth={1.3} />
          <path d="M117 211 L111 232 L116.5 230 L120 215 L123.5 230 L129 232 L123 211 Z" fill="#c8455a" {...outline} strokeWidth={1.2} />
          <circle cx="120" cy="208.5" r="3.6" fill="#e05a6c" {...outline} strokeWidth={1.2} />
          <path d="M108 240 L114 312 M132 240 L126 312" stroke="#cdb48a" strokeWidth="1.6" />
          {[258, 280].map((y) => (
            <circle key={y} cx="131" cy={y} r="2.6" fill="#c8b38c" />
          ))}
        </>
      ) : (
        <>
          <path d="M100 182 L120 198 L140 182 L144 198 L120 212 L96 198 Z" fill="#245d7d" {...outline} />
          <path d="M108 200 L120 212 L132 200 L130 230 L110 230 Z" fill="#f6f6f6" />
          <path d="M120 212 L120 318" stroke="#e7f3fa" strokeWidth="2.4" />
          <path d="M86 202 C82 246 82 284 84 310 M154 202 C158 246 158 284 156 310" stroke="#e7f3fa" strokeWidth="3" fill="none" opacity=".9" />
          <rect x="116" y="226" width="8" height="10" rx="2" fill="#d8e2e8" stroke={LINE} strokeWidth="1" />
        </>
      )}

      {/* 顔 */}
      {!nagi && <ellipse cx="82" cy="124" rx="5.5" ry="9" fill={pal.skin} {...outline} />}
      <path d="M82 104 C82 76 100 62 120 62 C140 62 158 76 158 104 C158 124 154 138 146 149 C138 159 128 166 120 167 C112 166 102 159 94 149 C86 138 82 124 82 104 Z" fill={pal.skin} {...outline} />
      <path d="M83 106 C83 126 87 140 95 150 C103 160 110 165 117 166.5 C107 160 97 148 93 132 C91 120 91 110 93 100 Z" fill={pal.skinShade} opacity=".75" />
      <path d="M157 106 C157 124 154 136 147 147" stroke={rim} strokeWidth="2.2" fill="none" opacity=".75" strokeLinecap="round" />
      <path d="M86 98 C98 106 108 100 120 106 C132 100 146 106 156 98 L157 112 C146 118 132 112 120 118 C108 112 94 118 84 112 Z" fill={pal.skinShade} opacity=".85" />
      <Face face={face} blink={blink} mouthOpen={talking && flap} sharp={!nagi} uid={uid} pal={pal} />

      {/* 前髪 */}
      {nagi ? (
        <>
          <path d="M70 112 C64 62 94 36 122 36 C152 36 180 62 172 112 L166 100 L161 117 L151 92 L141 113 L132 88 L122 109 L112 86 L104 111 L94 90 L87 116 L80 98 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M112 86 L116 58 L119 90 Z M132 88 L128 60 L136 92 Z M151 92 L150 66 L155 98 Z M94 90 L99 63 L100 96 Z" fill={pal.hairDark} opacity=".55" />
          <path d="M70 100 C63 128 65 158 74 182 L80 170 L85 182 C82 158 82 128 87 104 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M170 100 C177 128 175 158 166 182 L160 170 L155 182 C158 158 158 128 153 104 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M172 104 C176 130 174 158 168 176" stroke={rim} strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
          <g transform="rotate(-24 150 80)">
            <rect x="140" y="77" width="20" height="5" rx="2.5" fill="#ffb44a" stroke={LINE} strokeWidth="1" />
            <rect x="146" y="72" width="5" height="15" rx="2.5" fill="#ff8a5a" stroke={LINE} strokeWidth="1" />
          </g>
        </>
      ) : (
        <>
          <path d="M70 112 C64 60 96 36 124 36 C154 36 180 60 172 110 L165 92 C159 106 148 112 134 114 L140 98 C130 110 114 114 100 114 L108 99 C97 108 86 112 76 118 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M140 98 L132 62 L137 104 Z M108 99 L106 66 L112 102 Z M165 92 L158 64 L167 100 Z" fill={pal.hairDark} opacity=".55" />
          <path d="M72 100 C66 122 68 144 75 160 L82 150 C80 132 82 116 86 104 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <path d="M168 100 C174 122 172 144 166 160 L159 150 C161 132 159 116 155 104 Z" fill={`url(#${uid}-hair)`} {...outline} />
          <ellipse cx="152" cy="56" rx="10" ry="7.5" fill="#ff6b6b" stroke={LINE} strokeWidth="1.2" transform="rotate(30 152 56)" />
          <path d="M146 52 q6 3 12 1" stroke="#c84a4a" strokeWidth="1.4" fill="none" />
        </>
      )}
      {/* 天使の輪 */}
      <path d="M88 66 C98 56 108 52 118 51.5 L116.5 57.5 C106 58 97 62 90 70 Z" fill={pal.hairRing} opacity=".8" />
      <path d="M126 51.5 C138 52 150 57 158 66 L154.5 70 C147 62 137 58 127.5 57.5 Z" fill={pal.hairRing} opacity=".8" />
    </svg>
  )
}

function StagedCharacter({ id, cast, speaking, dim, talking, lineKey, reduced, px }: { id: CharId; cast: Cast; speaking: boolean; dim: boolean; talking: boolean; lineKey: string; reduced: boolean; px: MotionValue<number> }) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  useEffect(() => {
    if (!speaking || reduced || !scope.current) return
    animate(scope.current, { y: [0, -9, 0] }, { duration: 0.34, ease: 'easeOut' })
  }, [lineKey, speaking, reduced, animate, scope])

  return (
    <motion.div
      className={`absolute bottom-[-14%] aspect-[1/2] ${id === 'sora' ? 'h-[118%]' : 'h-[112%]'}`}
      style={{ x: '-50%', zIndex: speaking ? 2 : 1 }}
      initial={{ opacity: 0, left: POS_LEFT[cast.pos], y: reduced ? 0 : 24 }}
      animate={{
        opacity: 1,
        left: POS_LEFT[cast.pos],
        y: 0,
        scale: speaking && !reduced ? 1.02 : 1,
        filter: dim ? 'brightness(0.6) saturate(0.8)' : 'brightness(1) saturate(1)',
      }}
      exit={{ opacity: 0, y: reduced ? 0 : 18, transition: { duration: 0.45 } }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div ref={scope} className="h-full w-full origin-bottom" style={{ x: px }}>
        <Character id={id} face={cast.face} talking={talking} reduced={reduced} />
      </motion.div>
    </motion.div>
  )
}

const VN_CSS = `
.vn-grain { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.2 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
.vn-grain-anim { animation: vn-grain .6s steps(4) infinite; }
@keyframes vn-grain { 0% { transform: translate(0,0) } 25% { transform: translate(-7%,4%) } 50% { transform: translate(5%,-6%) } 75% { transform: translate(-3%,-8%) } 100% { transform: translate(0,0) } }
`

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export function VisualNovelAdv() {
  const reduced = !!useReducedMotion()
  const [history, setHistory] = useState<string[]>(['s1'])
  const [typed, setTyped] = useState(0)
  const [auto, setAuto] = useState(false)
  const [skip, setSkip] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [choiceCursor, setChoiceCursor] = useState(0)
  const [flashKey, setFlashKey] = useState(0)
  const [fadeKey, setFadeKey] = useState(0)

  // 視差（ポインター位置）: 空はシェーダーの uniform、人物と光の粒は motion value で動かす
  const par = useRef({ x: 0, y: 0 })
  const mx = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const charX = useTransform(sx, (v) => v * -14)
  const moteX = useTransform(sx, (v) => v * -30)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1
    const y = ((e.clientY - r.top) / r.height) * 2 - 1
    par.current = { x, y }
    mx.set(x)
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const logCloseRef = useRef<HTMLButtonElement>(null)
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([])

  const lineId = history[history.length - 1]
  const line = SCRIPT[lineId]
  const text = line.text
  const done = typed >= text.length
  const stage = useMemo(() => history.reduce((s, id) => applyStage(s, SCRIPT[id]), INITIAL_STAGE), [history])
  const dusk = Math.min(1, (history.length - 1) / 13)
  const centerTaken = stage.nagi.pos === 'center' || stage.sora.pos === 'center'
  const showChoice = !!line.choice && done && !hidden
  const showEnd = !!line.end && done
  const speakerInfo = line.speaker ? SPEAKER_INFO[line.speaker] : null
  const speakingChar = speakerInfo?.char ?? null

  // タイプライター（句読点で間を取る）
  useEffect(() => {
    if (typed >= text.length) return
    if (skip) {
      setTyped(text.length)
      return
    }
    const prev = text[typed - 1] ?? ''
    const delay = typed === 0 ? 160 : '。！？'.includes(prev) ? 260 : '、'.includes(prev) ? 130 : prev === '…' ? 90 : 36
    const t = window.setTimeout(() => setTyped((n) => n + 1), delay)
    return () => window.clearTimeout(t)
  }, [typed, text, skip])

  const goTo = (id: string) => {
    setHistory((h) => [...h, id])
    setTyped(0)
    setChoiceCursor(0)
  }
  const goNext = () => {
    if (line.next) goTo(line.next)
  }

  // オート
  useEffect(() => {
    if (!auto || skip || !done || line.choice || line.end || logOpen || hidden || !line.next) return
    const next = line.next
    const t = window.setTimeout(() => goTo(next), 1300 + text.length * 32)
    return () => window.clearTimeout(t)
  }, [auto, skip, done, line, logOpen, hidden, text])

  // スキップ（選択肢・エンドで止まる）
  useEffect(() => {
    if (!skip || !done) return
    if (line.choice || line.end || !line.next) {
      setSkip(false)
      return
    }
    const next = line.next
    const t = window.setTimeout(() => goTo(next), 120)
    return () => window.clearTimeout(t)
  }, [skip, done, line])

  // 選択肢が出たらフォーカスを移す
  useEffect(() => {
    if (!showChoice) return
    const root = rootRef.current
    if (root && root.contains(document.activeElement)) choiceRefs.current[0]?.focus({ preventScroll: true })
  }, [showChoice])

  // ログを開いたら末尾へ
  useEffect(() => {
    if (!logOpen) return
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
    logCloseRef.current?.focus({ preventScroll: true })
  }, [logOpen])

  const advance = () => {
    if (hidden) {
      setHidden(false)
      return
    }
    if (logOpen) return
    if (!done) {
      setTyped(text.length)
      return
    }
    if (line.choice || line.end) return
    goNext()
  }

  const choose = (idx: number) => {
    const c = line.choice?.[idx]
    if (!c) return
    setChoices((m) => ({ ...m, [lineId]: c.label }))
    setFlashKey((k) => k + 1)
    goTo(c.next)
    rootRef.current?.focus({ preventScroll: true })
  }

  const restart = () => {
    setFadeKey((k) => k + 1)
    setHistory(['s1'])
    setTyped(0)
    setChoices({})
    setAuto(false)
    setSkip(false)
    setLogOpen(false)
    setHidden(false)
    rootRef.current?.focus({ preventScroll: true })
  }

  const closeLog = () => {
    setLogOpen(false)
    rootRef.current?.focus({ preventScroll: true })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    const target = e.target as HTMLElement
    const onButton = target !== e.currentTarget && target.tagName === 'BUTTON'
    const lower = k.length === 1 ? k.toLowerCase() : k

    if (logOpen) {
      if (k === 'Escape' || lower === 'l') {
        closeLog()
        e.preventDefault()
      } else if (k === 'ArrowUp' || k === 'ArrowDown') {
        logRef.current?.scrollBy({ top: k === 'ArrowUp' ? -60 : 60 })
        e.preventDefault()
      }
      return
    }
    if (hidden) {
      if (k === 'Escape' || k === 'Enter' || k === ' ' || lower === 'h' || k.startsWith('Arrow')) {
        setHidden(false)
        e.preventDefault()
      }
      return
    }
    if (showChoice && line.choice) {
      const n = line.choice.length
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        const next = (choiceCursor + (k === 'ArrowDown' ? 1 : n - 1)) % n
        setChoiceCursor(next)
        choiceRefs.current[next]?.focus({ preventScroll: true })
        e.preventDefault()
        return
      }
      if (/^[1-9]$/.test(k) && Number(k) <= n) {
        choose(Number(k) - 1)
        e.preventDefault()
        return
      }
      if ((k === 'Enter' || k === ' ') && !onButton) {
        choose(choiceCursor)
        e.preventDefault()
        return
      }
    }
    if ((k === 'Enter' || k === ' ') && !onButton) {
      advance()
      e.preventDefault()
    } else if (k === 'ArrowRight' || k === 'ArrowDown') {
      if (!onButton) advance()
      e.preventDefault()
    } else if (k.startsWith('Arrow')) {
      e.preventDefault()
    } else if (lower === 'l') setLogOpen(true)
    else if (lower === 'h') setHidden(true)
    else if (lower === 'a') toggleAuto()
    else if (lower === 's') toggleSkip()
  }

  const toggleAuto = () => {
    setAuto((a) => !a)
    setSkip(false)
  }
  const toggleSkip = () => {
    if (line.choice || line.end) return
    setSkip((s) => !s)
    setAuto(false)
  }

  const onStageClick = () => advance()
  const onContextMenu = (e: MouseEvent) => {
    if (logOpen) return
    e.preventDefault()
    setHidden((h) => !h)
  }
  const stop = (e: MouseEvent) => e.stopPropagation()

  const shown = text.slice(0, typed)
  const narration = !line.speaker

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onStageClick}
      onContextMenu={onContextMenu}
      onPointerMove={onPointerMove}
      role="application"
      aria-roledescription="ノベルゲーム"
      aria-label="ノベルゲームのADV画面。Enterで文章を送る"
      className="@container relative h-full w-full cursor-pointer overflow-hidden bg-[#1b1530] font-sans text-white outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd27a]/70"
    >
      {/* 背景: WebGL の空と海 + SVG の駅 */}
      <div className="absolute inset-0" aria-hidden="true">
        <Canvas dpr={[1, 1.75]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }} flat linear orthographic camera={{ position: [0, 0, 1] }}>
          <SkyQuad dusk={dusk} flashKey={flashKey} par={par} reduced={reduced} />
        </Canvas>
      </div>
      <StationForeground lights={stage.lights} train={stage.train} reduced={reduced} />
      {/* 光の粒（手前のボケ） */}
      {!reduced && (
        <motion.div className="pointer-events-none absolute inset-0 z-[5]" style={{ x: moteX }} aria-hidden="true">
          {MOTES.map((m, i) => (
            <motion.span
              key={i}
              className={`absolute rounded-full bg-[radial-gradient(circle,#fff4d6,#ffc27a_45%,transparent_70%)] mix-blend-screen ${m.blur ? 'blur-[2px]' : ''}`}
              style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size * 2, height: m.size * 2 }}
              animate={{ y: [0, -50, -100], opacity: [0, 0.9, 0] }}
              transition={{ duration: m.d, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_55%,rgba(20,10,40,.55))]" aria-hidden="true" />

      {/* 立ち絵 */}
      <div className="pointer-events-none absolute inset-x-0 top-[3%] bottom-0">
        <AnimatePresence>
          {(['nagi', 'sora'] as const)
            .filter((id) => stage[id].pos !== 'off')
            .map((id) => (
              <StagedCharacter
                key={id}
                id={id}
                cast={stage[id]}
                speaking={speakingChar === id}
                dim={speakingChar !== null && speakingChar !== id}
                talking={speakingChar === id && !done}
                lineKey={lineId}
                reduced={reduced}
                px={charX}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* フィルムグレイン */}
      <div className={`vn-grain pointer-events-none absolute -inset-[50%] z-[6] opacity-[.09] mix-blend-overlay ${reduced ? '' : 'vn-grain-anim'}`} aria-hidden="true" />
      {/* 分岐時の光のトランジション */}
      <AnimatePresence>
        {flashKey > 0 && !reduced && (
          <motion.div
            key={`leak-${flashKey}`}
            className="pointer-events-none absolute inset-0 z-[45] mix-blend-screen"
            style={{ background: 'radial-gradient(ellipse at 68% 62%, rgba(255,240,215,.95), rgba(255,170,120,.55) 35%, rgba(255,120,150,0) 70%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.3, 1.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, times: [0, 0.25, 1], ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {fadeKey > 0 && (
          <motion.div
            key={`fade-${fadeKey}`}
            className="pointer-events-none absolute inset-0 z-[55] bg-[#0b0716]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 1.2, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>
      <style>{VN_CSS}</style>

      {/* 章タイトルとモード表示 */}
      <AnimatePresence>
        {!hidden && (
          <motion.div
            key="chapter"
            className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-full border border-white/20 bg-[#1c1634]/55 py-1 pr-3 pl-1.5 text-[11px] font-bold tracking-wider backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="rounded-full bg-[#ff9fb6] px-2 py-px font-['Space_Grotesk'] text-[10px] text-[#3a1830]">EP.03</span>
            夕凪駅 ― 18:42
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(auto || skip) && !hidden && (
          <motion.div
            key={auto ? 'auto' : 'skip'}
            className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 font-['Space_Grotesk'] text-[11px] font-bold tracking-[.2em] text-[#ffd27a] backdrop-blur-sm"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            {auto ? 'AUTO' : 'SKIP'}
            <motion.span animate={reduced ? {} : { opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
              {auto ? '▶' : '▶▶'}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 選択肢 */}
      <AnimatePresence>
        {showChoice && line.choice && (
          <motion.div
            key="choice"
            className="absolute inset-x-0 top-0 bottom-[38%] z-30 flex flex-col items-center justify-center gap-2.5 bg-[#140c26]/35 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={stop}
            role="group"
            aria-label="選択肢"
          >
            {line.choice.map((c, i) => (
              <motion.button
                key={c.label}
                ref={(el) => {
                  choiceRefs.current[i] = el
                }}
                type="button"
                onClick={() => choose(i)}
                onFocus={() => setChoiceCursor(i)}
                onMouseEnter={() => setChoiceCursor(i)}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scaleX: 0.92 }}
                animate={{ opacity: 1, y: 0, scaleX: 1 }}
                transition={{ delay: reduced ? 0 : 0.08 + i * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`relative w-[min(26rem,92%)] overflow-hidden rounded-xl border px-5 py-2.5 text-center text-[14px] font-bold tracking-wide outline-none backdrop-blur-md transition-colors ${
                  choiceCursor === i
                    ? 'border-[#ffd27a] bg-[linear-gradient(90deg,rgba(255,159,182,.45),rgba(255,210,122,.45))] text-white shadow-[0_0_24px_rgba(255,190,120,.45)]'
                    : 'border-white/35 bg-[#1c1634]/60 text-white/90'
                }`}
              >
                <span className="mr-2 font-['Space_Grotesk'] text-[11px] text-[#ffd27a]">{i + 1}</span>
                {c.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* エンド */}
      <AnimatePresence>
        {showEnd && !hidden && (
          <motion.div
            key="end"
            className={`absolute top-[14%] z-30 flex flex-col gap-2 px-4 ${centerTaken ? 'right-[3%] items-end text-right' : 'inset-x-0 items-center text-center'}`}
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: reduced ? 0 : 0.9, duration: 0.8 }}
            onClick={stop}
          >
            <span className="font-['Playfair_Display'] text-[13px] tracking-[.5em] text-[#ffe3b0] italic [text-shadow:0_2px_10px_rgba(0,0,0,.6)]">― fin ―</span>
            <span className="rounded-lg bg-[#1c1634]/60 px-4 py-1.5 text-[15px] font-black tracking-wider backdrop-blur-md [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">{line.end}</span>
            <button
              type="button"
              onClick={restart}
              className="mt-1 flex items-center gap-1.5 rounded-full border border-[#ffd27a]/70 bg-[#1c1634]/70 px-4 py-1.5 text-[12px] font-bold outline-none backdrop-blur-md hover:bg-[#2c2350] focus-visible:ring-2 focus-visible:ring-[#ffd27a]"
            >
              <RotateCcw size={13} aria-hidden="true" /> はじめから
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* テキスト窓 */}
      <AnimatePresence>
        {!hidden && (
          <motion.div
            key="window"
            className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[var(--solo-footer-clearance,0.75rem)] @min-[40rem]:px-6"
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="relative mx-auto max-w-[1000px] pt-4">
              {/* 名前枠 */}
              <AnimatePresence mode="wait">
                {line.speaker && speakerInfo && (
                  <motion.div
                    key={line.speaker}
                    className="absolute top-0 left-4 z-10 flex items-baseline gap-2 rounded-t-lg rounded-br-lg border border-white/30 bg-[#1c1634]/85 py-1 pr-4 pl-3 shadow-[0_4px_14px_rgba(0,0,0,.35)] backdrop-blur-md"
                    style={{ boxShadow: `inset 3px 0 0 ${speakerInfo.color}, 0 4px 14px rgba(0,0,0,.35)` }}
                    initial={{ opacity: 0, x: reduced ? 0 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <span className="text-[14px] font-black tracking-[.2em]" style={{ color: speakerInfo.color }}>
                      {line.speaker}
                    </span>
                    <span className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[.3em] text-white/50">{speakerInfo.roman}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative min-h-[118px] rounded-2xl border border-white/25 bg-[linear-gradient(180deg,rgba(30,22,58,.58),rgba(16,12,34,.78))] px-5 pt-5 pb-9 shadow-[0_10px_30px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-md @min-[48rem]:min-h-[132px] @min-[48rem]:px-8">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd27a]/70 to-transparent" />
                <span className="sr-only" aria-live="polite">
                  {line.speaker ? `${line.speaker}：` : ''}
                  {text}
                </span>
                <p
                  aria-hidden="true"
                  className={`text-[14px] leading-[1.85] tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,.7)] @min-[48rem]:text-[16px] ${narration ? 'text-[#f3e6d2]' : 'text-white'}`}
                >
                  {shown}
                  {/* 残りの文字を透明で置いて改行位置を固定する */}
                  <span className="opacity-0" aria-hidden="true">
                    {text.slice(typed)}
                  </span>
                </p>
                {done && !line.choice && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute right-5 bottom-9 text-[13px] text-[#ffd27a] [text-shadow:0_0_8px_rgba(255,200,120,.9)]"
                    animate={reduced ? {} : { y: [0, 4, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {line.end ? '■' : '▼'}
                  </motion.span>
                )}

                {/* クイックメニュー */}
                <div className="absolute right-3 bottom-2 flex gap-1" onClick={stop}>
                  <QuickButton label="オート" active={auto} onClick={toggleAuto} shortcut="A">
                    <Play size={11} aria-hidden="true" />
                  </QuickButton>
                  <QuickButton label="スキップ" active={skip} onClick={toggleSkip} shortcut="S">
                    <FastForward size={11} aria-hidden="true" />
                  </QuickButton>
                  <QuickButton label="ログ" onClick={() => setLogOpen(true)} shortcut="L">
                    <History size={11} aria-hidden="true" />
                  </QuickButton>
                  <QuickButton label="非表示" onClick={() => setHidden(true)} shortcut="H">
                    <EyeOff size={11} aria-hidden="true" />
                  </QuickButton>
                </div>
                <span className="absolute bottom-2.5 left-5 hidden font-['Space_Grotesk'] text-[9px] tracking-[.25em] text-white/35 @min-[36rem]:inline @min-[48rem]:left-8">
                  {String(history.length).padStart(2, '0')} / CLICK・ENTER
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hidden && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[var(--solo-footer-clearance,0.75rem)] text-center text-[11px] font-bold tracking-widest text-white/60 [text-shadow:0_1px_4px_rgba(0,0,0,.8)]">
          クリックで テキストを表示
        </div>
      )}

      {/* バックログ */}
      <AnimatePresence>
        {logOpen && (
          <motion.div
            key="log"
            role="dialog"
            aria-label="バックログ"
            className="absolute inset-0 z-40 flex cursor-default flex-col bg-[#120c24]/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={stop}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              closeLog()
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-2.5 @min-[40rem]:px-8">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black tracking-[.3em]">バックログ</span>
                <span className="font-['Space_Grotesk'] text-[10px] tracking-[.3em] text-white/40">BACKLOG</span>
              </div>
              <button
                ref={logCloseRef}
                type="button"
                onClick={closeLog}
                aria-label="ログを閉じる"
                className="grid size-8 place-items-center rounded-full border border-white/25 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#ffd27a]"
              >
                <X size={15} />
              </button>
            </div>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[calc(var(--solo-footer-clearance,0.75rem)+0.5rem)] [scrollbar-width:thin] @min-[40rem]:px-8">
              <ol className="mx-auto flex max-w-[860px] flex-col gap-3">
                {history.map((id, i) => {
                  const l = SCRIPT[id]
                  const isCurrent = i === history.length - 1
                  const info = l.speaker ? SPEAKER_INFO[l.speaker] : null
                  return (
                    <li key={`${id}-${i}`} className={`grid grid-cols-[4.5em_1fr] gap-3 text-[13px] leading-relaxed ${isCurrent ? '' : 'opacity-80'}`}>
                      <span className="pt-px text-right font-black tracking-widest" style={{ color: info?.color ?? '#8f86a8' }}>
                        {l.speaker ?? '―'}
                      </span>
                      <span className={l.speaker ? 'text-white' : 'text-[#e8dccb]'}>
                        {isCurrent ? text.slice(0, Math.max(typed, 0)) || '…' : l.text}
                        {choices[id] && (
                          <span className="mt-1 block w-fit rounded-md border border-[#ffd27a]/50 bg-[#ffd27a]/10 px-2 py-0.5 text-[12px] font-bold text-[#ffd27a]">
                            ▶ {choices[id]}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QuickButton({ label, active, onClick, shortcut, children }: { label: string; active?: boolean; onClick: () => void; shortcut: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active === undefined ? undefined : active}
      title={`${label}（${shortcut}）`}
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ffd27a] ${
        active ? 'border-[#ffd27a] bg-[#ffd27a]/25 text-[#ffe3b0]' : 'border-white/25 bg-white/5 text-white/80 hover:bg-white/15'
      }`}
    >
      {children}
      <span className="hidden @min-[30rem]:inline">{label}</span>
      <span className="sr-only @min-[30rem]:hidden">{label}</span>
    </button>
  )
}
