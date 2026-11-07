/**
 * サバイバルホラー風の「マス目に詰める」インベントリ。
 * - 革張りのアタッシュケースに 10×6 のマス目。アイテムは 1×1〜2×4 の大きさで、アイコンはすべて SVG で描画
 * - ドラッグは Pointer Events + setPointerCapture で自前実装。マス目にスナップした配置プレビューを
 *   置ける位置は緑・重なる/はみ出す位置は赤で表示する
 * - R キー / 右クリックで90度回転（ドラッグ中も可）。ケース外の「足元」エリアとの出し入れ
 * - 「整理する」は面積の大きい順に列優先のファーストフィットで詰め直し、CSS トランジションで移動させる
 * - キーボード: Tab でアイテム選択、矢印で1マス移動、R で回転、Enter でケース⇔足元の出し入れ、Esc でドラッグ取消
 * - マスの大きさは CSS コンテナクエリ単位（cqw / cqh）から算出する --cell 変数で決め、JS の計測に頼らず
 *   カードでも全画面でも空き領域いっぱいにケースを広げる（ドラッグ計算は描画済みグリッドの実寸から取得）
 * - 「調べる」（X キー / ダブルクリック）で React Three Fiber の3Dビューを開く。アイテムはプリミティブと
 *   Extrude/Lathe/Tube ジオメトリで組んだ PBR モデル。環境光は <Environment> + <Lightformer>（HDR を読み込まない）、
 *   ドラッグ/矢印キーで慣性つき回転、ContactShadows、CanvasTexture のラベル
 */
import { useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ChevronLeft, ChevronRight, LayoutGrid, RotateCcw, RotateCw, Search, X, ZoomIn, ZoomOut } from 'lucide-react'

const COLS = 10
const ROWS = 6
const FRAME = 18 // 革の縁 + 内側の余白（片側）

type Category = '武器' | '回復' | '弾薬' | '道具' | '重要'
type Art =
  | 'handgun' | 'shotgun' | 'knife' | 'spray' | 'grenade' | 'ammo' | 'shells'
  | 'flashlight' | 'key' | 'crowbar' | 'radio' | 'rope' | 'can' | 'ampoule'

interface ItemDef {
  name: string
  w: number
  h: number
  category: Category
  desc: string
  art: Art
}

interface Inst {
  uid: string
  def: Art
  rot: boolean
  loc: 'case' | 'floor'
  x: number
  y: number
  count?: number
}

const DEFS: Record<Art, ItemDef> = {
  handgun: { name: '自動拳銃', w: 3, h: 2, category: '武器', art: 'handgun', desc: '小型で扱いやすい9mm口径の拳銃。装弾数は少ないが、反動が軽く連射がきく。' },
  shotgun: { name: 'ポンプ式散弾銃', w: 4, h: 2, category: '武器', art: 'shotgun', desc: '近距離で絶大な威力を発揮する。一発ごとにフォアエンドを引いて装填する。' },
  knife: { name: 'サバイバルナイフ', w: 3, h: 1, category: '武器', art: 'knife', desc: '刃渡りの長い軍用ナイフ。弾を節約したいときの頼れる相棒。' },
  spray: { name: '救急スプレー', w: 1, h: 2, category: '回復', art: 'spray', desc: '体力を全回復する医療用スプレー。かすかに消毒液の匂いがする。' },
  grenade: { name: '破片手榴弾', w: 1, h: 2, category: '武器', art: 'grenade', desc: 'ピンを抜いて投げる。群れを一掃できるが、巻き込まれないよう注意。' },
  ammo: { name: '9mm弾', w: 1, h: 1, category: '弾薬', art: 'ammo', desc: '拳銃用の弾薬。紙箱にぎっしり詰まっている。' },
  shells: { name: '散弾', w: 2, h: 1, category: '弾薬', art: 'shells', desc: '散弾銃用のシェル。赤い紙薬莢。' },
  flashlight: { name: '懐中電灯', w: 2, h: 1, category: '道具', art: 'flashlight', desc: '電池式のライト。ときどき点滅するのは、接触が悪いせいだと思いたい。' },
  key: { name: '錆びた鍵', w: 1, h: 1, category: '重要', art: 'key', desc: '持ち手に「B2 機械室」と刻まれた古い鍵。' },
  crowbar: { name: 'バール', w: 1, h: 4, category: '道具', art: 'crowbar', desc: '赤く塗られた鉄製のバール。板で塞がれた扉をこじ開けられそうだ。' },
  radio: { name: '携帯無線機', w: 2, h: 3, category: '道具', art: 'radio', desc: 'ノイズ混じりの無線機。3チャンネルから、ときどき誰かの声が聞こえる。' },
  rope: { name: 'ナイロンロープ', w: 2, h: 2, category: '道具', art: 'rope', desc: '丈夫なロープ。吹き抜けを降りるのに使えるかもしれない。' },
  can: { name: '缶詰', w: 1, h: 1, category: '回復', art: 'can', desc: '賞味期限は見なかったことにする。体力が少しだけ回復する。' },
  ampoule: { name: '鎮静剤アンプル', w: 1, h: 1, category: '回復', art: 'ampoule', desc: '青い薬液の入ったアンプル。救急スプレーと組み合わせられそうだ。' },
}

const CATEGORY_COLOR: Record<Category, string> = {
  武器: '#c9573f',
  回復: '#4fb07c',
  弾薬: '#d2a744',
  道具: '#6b93ba',
  重要: '#b27bd8',
}

const INITIAL: Inst[] = [
  { uid: 'i1', def: 'handgun', rot: false, loc: 'case', x: 0, y: 0 },
  { uid: 'i2', def: 'spray', rot: false, loc: 'case', x: 3, y: 0 },
  { uid: 'i3', def: 'key', rot: false, loc: 'case', x: 4, y: 0 },
  { uid: 'i4', def: 'shotgun', rot: false, loc: 'case', x: 5, y: 1 },
  { uid: 'i5', def: 'ammo', rot: false, loc: 'case', x: 0, y: 3, count: 15 },
  { uid: 'i6', def: 'flashlight', rot: false, loc: 'case', x: 3, y: 3 },
  { uid: 'i7', def: 'grenade', rot: false, loc: 'case', x: 9, y: 3 },
  { uid: 'i8', def: 'knife', rot: false, loc: 'case', x: 6, y: 4 },
  { uid: 'i9', def: 'shells', rot: false, loc: 'case', x: 1, y: 5, count: 8 },
  { uid: 'f1', def: 'crowbar', rot: false, loc: 'floor', x: 0, y: 0 },
  { uid: 'f2', def: 'radio', rot: false, loc: 'floor', x: 0, y: 0 },
  { uid: 'f3', def: 'rope', rot: false, loc: 'floor', x: 0, y: 0 },
  { uid: 'f4', def: 'can', rot: false, loc: 'floor', x: 0, y: 0, count: 2 },
  { uid: 'f5', def: 'ampoule', rot: false, loc: 'floor', x: 0, y: 0 },
]

const dims = (it: Pick<Inst, 'def' | 'rot'>, rot = it.rot): [number, number] => {
  const d = DEFS[it.def]
  return rot ? [d.h, d.w] : [d.w, d.h]
}

function fits(items: Inst[], uid: string, x: number, y: number, w: number, h: number) {
  if (x < 0 || y < 0 || x + w > COLS || y + h > ROWS) return false
  for (const it of items) {
    if (it.uid === uid || it.loc !== 'case') continue
    const [iw, ih] = dims(it)
    if (x < it.x + iw && x + w > it.x && y < it.y + ih && y + h > it.y) return false
  }
  return true
}

/** 空いている最初の位置を探す（列優先 or 行優先）。回転も試し、より手前に置ける向きを採用 */
function findSpot(items: Inst[], it: Inst, columnMajor = true): { x: number; y: number; rot: boolean } | null {
  const d = DEFS[it.def]
  const orients = d.w === d.h ? [it.rot] : [true, false]
  let best: { x: number; y: number; rot: boolean; score: number } | null = null
  for (const rot of orients) {
    const [w, h] = dims(it, rot)
    let found: { x: number; y: number } | null = null
    outer: for (let a = 0; a < (columnMajor ? COLS : ROWS); a++) {
      for (let b = 0; b < (columnMajor ? ROWS : COLS); b++) {
        const x = columnMajor ? a : b
        const y = columnMajor ? b : a
        if (fits(items, it.uid, x, y, w, h)) {
          found = { x, y }
          break outer
        }
      }
    }
    if (!found) continue
    const primary = columnMajor ? found.x * ROWS + found.y : found.y * COLS + found.x
    // 同じ位置なら、列優先では縦長、行優先では横長を優先
    const score = primary * 2 + ((columnMajor ? h >= w : w >= h) ? 0 : 1)
    if (!best || score < best.score) best = { ...found, rot, score }
  }
  return best ? { x: best.x, y: best.y, rot: best.rot } : null
}

function pack(items: Inst[]): Inst[] | null {
  const inCase = items.filter((i) => i.loc === 'case')
  const area = (i: Inst) => DEFS[i.def].w * DEFS[i.def].h
  const side = (i: Inst) => Math.max(DEFS[i.def].w, DEFS[i.def].h)
  const order = [...inCase].sort((a, b) => area(b) - area(a) || side(b) - side(a))
  for (const columnMajor of [true, false]) {
    // いったん全部をケース外扱いにして、順番に置き直す
    let work: Inst[] = items.map((i) => (i.loc === 'case' ? { ...i, loc: 'floor' as const } : i))
    let ok = true
    for (const it of order) {
      const spot = findSpot(work, it, columnMajor)
      if (!spot) {
        ok = false
        break
      }
      work = work.map((w) => (w.uid === it.uid ? { ...w, loc: 'case', ...spot } : w))
    }
    if (ok) return work
  }
  return null
}

/* ------------------------------------------------------------------ */
/* item art                                                            */
/* ------------------------------------------------------------------ */

function ItemArt({ art }: { art: Art }) {
  const d = DEFS[art]
  const vw = d.w * 20
  const vh = d.h * 20
  let g: ReactNode = null
  switch (art) {
    case 'handgun':
      g = (
        <g stroke="#0d0e10" strokeWidth=".8" strokeLinejoin="round">
          <path d="M14 19 L40 19 L38 24 L30 24 L27 27 Q24 23 22 22 Z" fill="#2c2f35" />
          <path d="M15 20 L26 20 L23 35 Q22.5 37.5 19.5 37.5 L11.5 37.5 Q9 37.5 9.6 34.8 Z" fill="url(#ginv-dark)" />
          <path d="M13 24 L21.5 24 M12.4 27.5 L21 27.5 M11.8 31 L20.4 31 M11.2 34.5 L19.8 34.5" stroke="#4a4f57" strokeWidth=".7" />
          <path d="M26 21.5 Q26.5 28.5 33 27.5 L34 22" fill="none" stroke="#17191c" strokeWidth="1.8" />
          <path d="M8 9.5 H54 Q56 9.5 56 11.5 V19.5 H8 Z" fill="url(#ginv-metal)" />
          <path d="M30 11 V18 M33 11 V18 M36 11 V18 M39 11 V18" stroke="#5b636d" strokeWidth=".8" />
          <rect x="52" y="7.6" width="2.4" height="2.2" fill="#1a1c20" />
          <rect x="9" y="7.6" width="4" height="2.2" fill="#1a1c20" />
          <rect x="54.5" y="13" width="2.6" height="2.4" fill="#0b0b0c" />
        </g>
      )
      break
    case 'shotgun':
      g = (
        <g stroke="#0d0e10" strokeWidth=".8" strokeLinejoin="round">
          <path d="M2 17 L24 13 L27 22 L7 31 Q2.5 32 2 27 Z" fill="url(#ginv-wood)" />
          <path d="M4 26 L22 19" stroke="#5a3218" strokeWidth=".7" />
          <rect x="23" y="11.5" width="20" height="11" rx="1.6" fill="url(#ginv-metal)" />
          <path d="M28 22.5 Q28.5 29 35 28 L36 22.5" fill="none" stroke="#17191c" strokeWidth="1.8" />
          <rect x="42" y="12.5" width="36" height="4.2" fill="#3a3e45" />
          <rect x="42" y="17.4" width="31" height="3.4" fill="#25282d" />
          <rect x="49" y="16" width="16" height="7" rx="2.2" fill="url(#ginv-wood)" />
          <path d="M51 17 V22 M54 17 V22 M57 17 V22 M60 17 V22 M63 17 V22" stroke="#6b3d1f" strokeWidth=".7" />
          <rect x="75.5" y="10.6" width="1.6" height="2.2" fill="#9aa2ad" />
        </g>
      )
      break
    case 'knife':
      g = (
        <g stroke="#0d0e10" strokeWidth=".8" strokeLinejoin="round">
          <path d="M25 6.5 H50 Q56 7 58.5 10.5 Q55 13.8 49 13.8 H25 Z" fill="url(#ginv-steel)" />
          <path d="M27 8.8 H48" stroke="#ffffff" strokeWidth=".8" opacity=".7" />
          <path d="M25 13.8 L33 13.8 L34.5 15.5 L36 13.8" fill="none" stroke="#6b737d" strokeWidth=".8" />
          <rect x="21.5" y="3.5" width="3.5" height="13" rx="1" fill="#2c2f35" />
          <rect x="4" y="6.8" width="17.5" height="6.4" rx="2.6" fill="#232427" />
          <path d="M8 7 V13 M11 7 V13 M14 7 V13 M17 7 V13" stroke="#3d3f44" strokeWidth=".9" />
          <circle cx="5.6" cy="10" r="1.1" fill="#9aa2ad" />
        </g>
      )
      break
    case 'spray':
      g = (
        <g stroke="#1d2224" strokeWidth=".8" strokeLinejoin="round">
          <rect x="8" y="1.5" width="4" height="3.5" rx=".6" fill="#8b949c" />
          <rect x="5.5" y="4.5" width="9" height="5.5" rx="1.2" fill="#2fa86a" />
          <rect x="3.5" y="9.5" width="13" height="27.5" rx="2.6" fill="url(#ginv-can)" />
          <path d="M8.2 16.5 H11.8 V20 H15.3 V23.6 H11.8 V27.1 H8.2 V23.6 H4.7 V20 H8.2 Z" fill="#2fa86a" stroke="none" />
          <rect x="3.5" y="30.5" width="13" height="2.6" fill="#2fa86a" stroke="none" />
          <path d="M6 12 V35" stroke="#ffffff" strokeWidth="1.2" opacity=".6" />
        </g>
      )
      break
    case 'grenade':
      g = (
        <g stroke="#101208" strokeWidth=".8" strokeLinejoin="round">
          <ellipse cx="10" cy="26.5" rx="7.6" ry="10" fill="url(#ginv-olive)" />
          <path d="M2.6 23 H17.4 M2.6 30 H17.4 M6.5 17.5 V35.5 M13.5 17.5 V35.5" stroke="#2f381b" strokeWidth=".8" fill="none" />
          <rect x="6.8" y="11.5" width="6.4" height="6" rx="1" fill="url(#ginv-metal)" />
          <path d="M12.6 12.4 Q17.8 13.5 16.4 30" stroke="#b8bec5" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="5" cy="10.5" r="3.2" fill="none" stroke="#d2d6da" strokeWidth="1.3" />
          <path d="M7.2 12 L8.4 13.6" stroke="#d2d6da" strokeWidth="1.1" />
        </g>
      )
      break
    case 'ammo':
      g = (
        <g stroke="#1b160a" strokeWidth=".7" strokeLinejoin="round">
          {[3.4, 7.2, 11, 14.8].map((x) => (
            <g key={x}>
              <rect x={x - 1.5} y="3.6" width="3" height="6" fill="url(#ginv-brass)" />
              <path d={`M${x - 1.5} 4 Q${x} 0.8 ${x + 1.5} 4 Z`} fill="#b07a3a" />
            </g>
          ))}
          <rect x="1.5" y="8" width="17" height="10.5" rx="1" fill="#6b5a2e" />
          <rect x="1.5" y="11" width="17" height="4.4" fill="#e2c46b" stroke="none" />
          <text x="10" y="14.6" textAnchor="middle" fontSize="3.6" fontWeight="700" fontFamily="'JetBrains Mono', monospace" fill="#3a2d0c" stroke="none">
            9mm
          </text>
        </g>
      )
      break
    case 'shells':
      g = (
        <g stroke="#1b0d0a" strokeWidth=".7" strokeLinejoin="round">
          {[3, 15, 27].map((x, i) => (
            <g key={x} transform={`rotate(${(i - 1) * 6} ${x + 5} 10)`}>
              <rect x={x} y="2.5" width="10" height="11.5" rx="1.6" fill="url(#ginv-red)" />
              <rect x={x} y="13" width="10" height="4.5" rx=".6" fill="url(#ginv-brass)" />
              <path d={`M${x + 2} 4 V12`} stroke="#ff9a8a" strokeWidth=".9" opacity=".6" />
            </g>
          ))}
        </g>
      )
      break
    case 'flashlight':
      g = (
        <g stroke="#0d0e10" strokeWidth=".8" strokeLinejoin="round">
          <rect x="3.5" y="6.8" width="23" height="6.4" rx="2.4" fill="url(#ginv-dark)" />
          <path d="M7 7 V13 M9.5 7 V13 M12 7 V13" stroke="#4a4f57" strokeWidth=".8" />
          <rect x="15" y="5.4" width="4.5" height="2" rx=".6" fill="#c33a2a" />
          <path d="M26 5.6 L33.5 3 V17 L26 14.4 Z" fill="url(#ginv-metal)" />
          <rect x="33.5" y="3" width="3" height="14" rx="1" fill="#fff1b0" />
          <path d="M34.5 4.5 V15.5" stroke="#fffbe6" strokeWidth="1" />
        </g>
      )
      break
    case 'key':
      g = (
        <g strokeLinejoin="round">
          <path d="M5.5 15 L4 19" stroke="#c8b78f" strokeWidth=".8" />
          <rect x="1.5" y="17" width="6" height="3" rx=".6" fill="#d9c8a0" stroke="#5a4a2a" strokeWidth=".5" transform="rotate(-14 4.5 18.5)" />
          <circle cx="6" cy="9.5" r="4" fill="none" stroke="url(#ginv-rust)" strokeWidth="2.6" />
          <rect x="9.6" y="8.4" width="9" height="2.4" rx=".6" fill="url(#ginv-rust)" />
          <path d="M14.8 10.6 V13.8 H16.3 V11.8 H17.6 V14.4 H18.6 V10.6 Z" fill="#8a5a2c" />
          <circle cx="12" cy="9.4" r=".5" fill="#5a3416" />
        </g>
      )
      break
    case 'crowbar':
      g = (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 76 V15 Q10.5 6.5 4.5 5.2" stroke="#1a0c08" strokeWidth="5.6" fill="none" />
          <path d="M10.5 76 V15 Q10.5 6.5 4.5 5.2" stroke="url(#ginv-crow)" strokeWidth="4" fill="none" />
          <path d="M10.5 76 L13.5 78.5" stroke="#1a0c08" strokeWidth="4.2" />
          <path d="M10.5 76 L13.5 78.5" stroke="#9aa2ad" strokeWidth="2.6" />
          <path d="M4.5 5.2 L2.2 6.6" stroke="#9aa2ad" strokeWidth="2.6" />
          <path d="M9.6 20 V70" stroke="#ff9a8a" strokeWidth=".8" opacity=".55" />
        </g>
      )
      break
    case 'radio':
      g = (
        <g stroke="#0d0e10" strokeWidth=".8" strokeLinejoin="round">
          <rect x="26" y="1.5" width="4.5" height="16" rx="2.2" fill="#1f2125" />
          <circle cx="13" cy="10.5" r="3.2" fill="url(#ginv-metal)" />
          <rect x="6" y="13" width="28" height="45" rx="4" fill="url(#ginv-radio)" />
          <rect x="10" y="17.5" width="20" height="9" rx="1.2" fill="#9fd18a" />
          <text x="20" y="24.4" textAnchor="middle" fontSize="5.4" fontWeight="700" fontFamily="'VT323', monospace" fill="#24401b" stroke="none">
            CH 03
          </text>
          {[31, 34, 37, 40, 43, 46].map((y) => (
            <path key={y} d={`M11 ${y} H29`} stroke="#1c1f19" strokeWidth="1.3" />
          ))}
          <rect x="11" y="50" width="6" height="4" rx="1" fill="#c33a2a" />
          <rect x="23" y="50" width="6" height="4" rx="1" fill="#3a3f36" />
          <path d="M8 16 V55" stroke="#ffffff" strokeWidth=".8" opacity=".25" />
        </g>
      )
      break
    case 'rope':
      g = (
        <g fill="none" strokeLinecap="round">
          {[15, 12, 9, 6].map((r, i) => (
            <ellipse key={r} cx="20" cy="20" rx={r + 1} ry={r} stroke={i % 2 ? '#c9a46a' : '#d8b97e'} strokeWidth="3.4" />
          ))}
          {[15, 12, 9, 6].map((r) => (
            <ellipse key={`s${r}`} cx="20" cy="20" rx={r + 1} ry={r} stroke="#7a5a2a" strokeWidth=".6" strokeDasharray="1.4 1.8" />
          ))}
          <path d="M33 26 Q38 32 34 37" stroke="#d8b97e" strokeWidth="3.4" />
          <path d="M34 37 l-1 1.8 M34 37 l1.4 1.4" stroke="#a88650" strokeWidth="1" />
        </g>
      )
      break
    case 'can':
      g = (
        <g stroke="#1a1408" strokeWidth=".7" strokeLinejoin="round">
          <rect x="3.5" y="4" width="13" height="13" rx="1.4" fill="url(#ginv-metal)" />
          <ellipse cx="10" cy="4.2" rx="6.5" ry="1.8" fill="#c5ccd3" />
          <rect x="3.5" y="7.4" width="13" height="7" fill="#c9862f" />
          <circle cx="10" cy="10.9" r="2.3" fill="#f1dca8" stroke="#7a4a14" strokeWidth=".5" />
          <path d="M7.5 3.6 Q10 2.4 12.5 3.6" stroke="#8b949c" strokeWidth=".7" fill="none" />
        </g>
      )
      break
    case 'ampoule':
      g = (
        <g strokeLinejoin="round" transform="rotate(-28 10 10)">
          <path d="M8 2 H12 V5 Q12 6.4 13.4 7.6 Q14.6 8.8 14.6 10.6 V17 Q14.6 18.6 13 18.6 H7 Q5.4 18.6 5.4 17 V10.6 Q5.4 8.8 6.6 7.6 Q8 6.4 8 5 Z" fill="url(#ginv-glass)" stroke="#2a3e58" strokeWidth=".7" />
          <path d="M5.6 12 H14.4 V17 Q14.4 18.4 13 18.4 H7 Q5.6 18.4 5.6 17 Z" fill="#3a8ee0" opacity=".85" />
          <path d="M7.2 9.5 V16.5" stroke="#ffffff" strokeWidth=".9" opacity=".8" strokeLinecap="round" />
          <rect x="7.6" y="4.4" width="4.8" height="1.2" fill="#e0606e" />
        </g>
      )
      break
  }
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="h-full w-full drop-shadow-[0_2px_2px_rgba(0,0,0,.6)]" aria-hidden="true" overflow="visible">
      {g}
    </svg>
  )
}

function GradientDefs() {
  const lin = (id: string, a: string, b: string, vertical = true) => (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  )
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        {lin('ginv-metal', '#b4bbc4', '#4b525c')}
        {lin('ginv-dark', '#3f434a', '#16181b')}
        {lin('ginv-wood', '#b4733f', '#6b3d1f')}
        {lin('ginv-brass', '#f6dc8a', '#a37a28')}
        {lin('ginv-steel', '#f2f5f8', '#8e98a3')}
        {lin('ginv-red', '#e0533f', '#8e2318', false)}
        {lin('ginv-olive', '#6e7d40', '#39431f')}
        {lin('ginv-rust', '#c08a4a', '#6a3a18')}
        {lin('ginv-crow', '#e0412e', '#8e1e14', false)}
        {lin('ginv-radio', '#4c5444', '#262a22')}
        {lin('ginv-can', '#f4f6f7', '#b9c1c7', false)}
        {lin('ginv-glass', '#e8f4ff', '#a9c6e6', false)}
      </defs>
    </svg>
  )
}

/** 回転を考慮してアイコンを外枠に収める */
function Rotated({ inst, unit }: { inst: Inst; unit: string }) {
  const d = DEFS[inst.def]
  return (
    <div
      className="absolute top-1/2 left-1/2 p-[6%] motion-safe:transition-transform motion-safe:duration-200"
      style={{ width: `calc(${unit} * ${d.w})`, height: `calc(${unit} * ${d.h})`, transform: `translate(-50%, -50%) rotate(${inst.rot ? 90 : 0}deg)` }}
    >
      <ItemArt art={inst.def} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3D examine view                                                     */
/* ------------------------------------------------------------------ */

const PBR = {
  gun: { color: '#2a2d33', metalness: 0.85, roughness: 0.32 },
  gunDark: { color: '#16181b', metalness: 0.8, roughness: 0.4 },
  steel: { color: '#d4d9de', metalness: 1, roughness: 0.16 },
  polymer: { color: '#1c1d20', metalness: 0.05, roughness: 0.72 },
  rubber: { color: '#121214', metalness: 0, roughness: 0.95 },
  wood: { color: '#7a4424', metalness: 0, roughness: 0.48 },
  brass: { color: '#d8ad52', metalness: 1, roughness: 0.28 },
  copper: { color: '#c8743f', metalness: 1, roughness: 0.3 },
  red: { color: '#b3261a', metalness: 0.25, roughness: 0.42 },
  olive: { color: '#4b582c', metalness: 0.25, roughness: 0.62 },
  rust: { color: '#8a5530', metalness: 0.65, roughness: 0.78 },
  paper: { color: '#e6dcc2', metalness: 0, roughness: 1 },
  card: { color: '#7d6236', metalness: 0, roughness: 0.92 },
  tin: { color: '#cdd3d9', metalness: 1, roughness: 0.24 },
  white: { color: '#eef1f3', metalness: 0.35, roughness: 0.3 },
  green: { color: '#23a160', metalness: 0.2, roughness: 0.3 },
  rope: { color: '#c9a46a', metalness: 0, roughness: 0.95 },
  radio: { color: '#3b4233', metalness: 0.1, roughness: 0.62 },
} as const

type PbrKey = keyof typeof PBR
const Mat = ({ k, side }: { k: PbrKey; side?: THREE.Side }) => <meshStandardMaterial {...PBR[k]} side={side} />

/** CanvasTexture でラベルを描く（フォント・画像の読み込みなし） */
function useLabel(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 128) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (ctx) draw(ctx, w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

function Ring({ r, tube, x = 0, y = 0, z = 0, k, axis = 'x' }: { r: number; tube: number; x?: number; y?: number; z?: number; k: PbrKey; axis?: 'x' | 'y' | 'z' }) {
  const rot: [number, number, number] = axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0]
  return (
    <mesh position={[x, y, z]} rotation={rot}>
      <torusGeometry args={[r, tube, 10, 40]} />
      <Mat k={k} />
    </mesh>
  )
}

/** X 軸方向に寝かせた円柱 */
function RodX({ r, r2, len, x = 0, y = 0, z = 0, k, seg = 28 }: { r: number; r2?: number; len: number; x?: number; y?: number; z?: number; k: PbrKey; seg?: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[r2 ?? r, r, len, seg]} />
      <Mat k={k} />
    </mesh>
  )
}

function Box({ size, pos, rot, k, radius = 0.03 }: { size: [number, number, number]; pos: [number, number, number]; rot?: [number, number, number]; k: PbrKey; radius?: number }) {
  return (
    <RoundedBox args={size} radius={Math.min(radius, Math.min(...size) / 2 - 0.001)} smoothness={3} position={pos} rotation={rot}>
      <Mat k={k} />
    </RoundedBox>
  )
}

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super()
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const turns = 5.5
    const a = t * Math.PI * 2 * turns
    const r = 0.62 + Math.sin(a * 3.1) * 0.025
    return target.set(Math.cos(a) * r, (t - 0.5) * 0.62 + Math.sin(a * 1.7) * 0.02, Math.sin(a) * r)
  }
}

function Model3D({ art }: { art: Art }) {
  const ammoLabel = useLabel((ctx, w, h) => {
    ctx.fillStyle = '#e4c46a'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#3a2d0c'
    ctx.fillRect(0, h * 0.72, w, h * 0.1)
    ctx.font = '900 64px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('9mm', w / 2, h * 0.58)
    ctx.font = '700 16px "JetBrains Mono", monospace'
    ctx.fillText('15 ROUNDS', w / 2, h * 0.95)
  })
  const lcd = useLabel((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#b8e6a0')
    g.addColorStop(1, '#7fbf6a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#1f3a17'
    ctx.font = '700 70px "VT323", "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CH 03', w / 2, h * 0.7)
  })
  const canLabel = useLabel(
    (ctx, w, h) => {
      ctx.fillStyle = '#c9862f'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#7a3f12'
      ctx.fillRect(0, 0, w, h * 0.12)
      ctx.fillRect(0, h * 0.88, w, h * 0.12)
      for (let i = 0; i < 2; i++) {
        const cx = w * (0.25 + i * 0.5)
        ctx.fillStyle = '#f1dca8'
        ctx.beginPath()
        ctx.arc(cx, h * 0.5, h * 0.24, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#5a2e0c'
        ctx.font = '900 40px "Noto Sans JP", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('保存食', cx, h * 0.58)
      }
    },
    512,
    128,
  )
  const blade = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.14)
    s.lineTo(1.45, 0.14)
    s.lineTo(2.08, -0.02)
    s.quadraticCurveTo(1.85, -0.17, 1.38, -0.17)
    s.lineTo(0, -0.17)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 3 })
    g.translate(0, 0, -0.0175)
    return g
  }, [])
  const helix = useMemo(() => new THREE.TubeGeometry(new HelixCurve(), 520, 0.07, 10, false), [])
  const crowbar = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, -1.9, 0), new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(-0.12, 1.72, 0), new THREE.Vector3(-0.38, 1.8, 0), new THREE.Vector3(-0.56, 1.66, 0)]),
        96,
        0.075,
        12,
        false,
      ),
    [],
  )
  const lever = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.78, 0), new THREE.Vector3(0.36, 0.62, 0), new THREE.Vector3(0.5, 0.2, 0), new THREE.Vector3(0.44, -0.25, 0)]), 40, 0.03, 8, false),
    [],
  )
  const ampoule = useMemo(() => {
    const pts = [
      [0, -0.8], [0.22, -0.8], [0.26, -0.72], [0.26, 0.28], [0.2, 0.44], [0.09, 0.55], [0.075, 0.68], [0.12, 0.84], [0.1, 1], [0, 1.04],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  useEffect(() => () => [blade, helix, crowbar, lever, ampoule].forEach((g) => g.dispose()), [blade, helix, crowbar, lever, ampoule])

  switch (art) {
    case 'handgun':
      return (
        <group>
          <Box size={[2.1, 0.4, 0.32]} pos={[0.05, 0.42, 0]} k="gun" radius={0.05} />
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[-0.78 + i * 0.065, 0.42, 0]}>
              <boxGeometry args={[0.022, 0.34, 0.335]} />
              <Mat k="gunDark" />
            </mesh>
          ))}
          <RodX r={0.085} len={0.08} x={1.12} y={0.42} k="steel" />
          <RodX r={0.045} len={0.02} x={1.165} y={0.42} k="rubber" />
          <Box size={[0.06, 0.08, 0.06]} pos={[0.98, 0.66, 0]} k="gunDark" radius={0.01} />
          <Box size={[0.1, 0.08, 0.18]} pos={[-0.86, 0.66, 0]} k="gunDark" radius={0.01} />
          <Box size={[1.55, 0.2, 0.28]} pos={[0.22, 0.13, 0]} k="polymer" radius={0.04} />
          <group position={[-0.62, -0.38, 0]} rotation={[0, 0, -0.22]}>
            <Box size={[0.46, 1.02, 0.3]} pos={[0, 0, 0]} k="polymer" radius={0.08} />
            <Box size={[0.34, 0.78, 0.02]} pos={[0, -0.02, 0.155]} k="rubber" radius={0.008} />
            <Box size={[0.34, 0.78, 0.02]} pos={[0, -0.02, -0.155]} k="rubber" radius={0.008} />
            <Box size={[0.52, 0.08, 0.32]} pos={[0, -0.52, 0]} k="gun" radius={0.02} />
          </group>
          <mesh position={[0.04, 0.03, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.21, 0.035, 10, 28, Math.PI]} />
            <Mat k="polymer" />
          </mesh>
          <mesh position={[-0.02, -0.06, 0]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.05, 0.17, 0.05]} />
            <Mat k="steel" />
          </mesh>
          <Box size={[0.12, 0.14, 0.12]} pos={[-0.98, 0.32, 0]} k="gunDark" radius={0.02} />
        </group>
      )
    case 'shotgun':
      return (
        <group>
          <Box size={[0.95, 0.38, 0.26]} pos={[-0.35, 0.05, 0]} k="gun" radius={0.04} />
          <RodX r={0.075} len={2.3} x={1.25} y={0.14} k="gunDark" />
          <RodX r={0.062} len={1.95} x={1.07} y={-0.04} k="gun" />
          <RodX r={0.115} len={0.72} x={0.72} y={-0.04} k="wood" />
          {[0.45, 0.58, 0.71, 0.84, 0.97].map((x) => (
            <Ring key={x} r={0.115} tube={0.012} x={x} y={-0.04} k="gunDark" />
          ))}
          <mesh position={[2.38, 0.24, 0]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <Mat k="brass" />
          </mesh>
          <Box size={[0.45, 0.26, 0.22]} pos={[-0.95, -0.08, 0]} rot={[0, 0, 0.3]} k="wood" radius={0.06} />
          <Box size={[1.25, 0.36, 0.24]} pos={[-1.62, -0.2, 0]} rot={[0, 0, 0.1]} k="wood" radius={0.08} />
          <Box size={[0.07, 0.46, 0.27]} pos={[-2.25, -0.27, 0]} rot={[0, 0, 0.1]} k="rubber" radius={0.03} />
          <mesh position={[-0.42, -0.16, 0]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.16, 0.03, 10, 24, Math.PI]} />
            <Mat k="gunDark" />
          </mesh>
          <mesh position={[-0.45, -0.22, 0]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.045, 0.14, 0.045]} />
            <Mat k="steel" />
          </mesh>
        </group>
      )
    case 'knife':
      return (
        <group>
          <mesh geometry={blade}>
            <Mat k="steel" />
          </mesh>
          <Box size={[0.08, 0.52, 0.14]} pos={[-0.04, -0.01, 0]} k="gunDark" radius={0.02} />
          <RodX r={0.105} r2={0.095} len={1.0} x={-0.58} k="rubber" />
          {[-0.25, -0.42, -0.59, -0.76, -0.93].map((x) => (
            <Ring key={x} r={0.1} tube={0.022} x={x} k="polymer" />
          ))}
          <RodX r={0.125} len={0.1} x={-1.12} k="steel" />
        </group>
      )
    case 'spray':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.38, 0.38, 1.6, 48]} />
            <Mat k="white" />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.384, 0.384, 0.18, 48]} />
            <Mat k="green" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.386, 0.386, 0.11, 24, 1, true, -0.5, 1]} />
            <Mat k="green" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.386, 0.386, 0.38, 12, 1, true, -0.15, 0.3]} />
            <Mat k="green" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <cylinderGeometry args={[0.3, 0.38, 0.12, 48]} />
            <Mat k="tin" />
          </mesh>
          <mesh position={[0, 1.08, 0]}>
            <cylinderGeometry args={[0.28, 0.3, 0.34, 40]} />
            <Mat k="green" />
          </mesh>
          <Box size={[0.12, 0.1, 0.2]} pos={[0, 1.3, 0.08]} k="polymer" radius={0.02} />
        </group>
      )
    case 'grenade':
      return (
        <group>
          <mesh scale={[1, 1.2, 1]}>
            <sphereGeometry args={[0.5, 48, 48]} />
            <Mat k="olive" />
          </mesh>
          {[-0.3, 0, 0.3].map((y) => (
            <Ring key={y} r={0.5 * Math.sqrt(1 - (y / 0.6) ** 2) + 0.004} tube={0.016} y={y} k="gunDark" axis="y" />
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]} scale={[1, 1.2, 1]}>
              <torusGeometry args={[0.503, 0.014, 8, 64]} />
              <Mat k="gunDark" />
            </mesh>
          ))}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.24, 24]} />
            <Mat k="steel" />
          </mesh>
          <mesh geometry={lever}>
            <Mat k="steel" />
          </mesh>
          <Ring r={0.13} tube={0.018} x={-0.22} y={0.78} k="steel" axis="z" />
        </group>
      )
    case 'ammo':
      return (
        <group>
          <Box size={[1.1, 0.6, 0.72]} pos={[0, -0.1, 0]} k="card" radius={0.02} />
          <mesh position={[0, -0.1, 0.362]}>
            <planeGeometry args={[1.0, 0.42]} />
            <meshStandardMaterial map={ammoLabel} roughness={0.85} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const x = -0.36 + (i % 4) * 0.24
            const z = -0.2 + Math.floor(i / 4) * 0.2
            return (
              <group key={i} position={[x, 0.3, z]}>
                <mesh>
                  <cylinderGeometry args={[0.075, 0.075, 0.26, 20]} />
                  <Mat k="brass" />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                  <coneGeometry args={[0.075, 0.16, 20]} />
                  <Mat k="copper" />
                </mesh>
              </group>
            )
          })}
        </group>
      )
    case 'shells':
      return (
        <group>
          {[-0.42, 0, 0.42].map((x, i) => (
            <group key={x} position={[x, 0, 0]} rotation={[0.1 * (i - 1), 0, -0.08 * (i - 1)]}>
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.165, 0.165, 0.78, 32]} />
                <Mat k="red" />
              </mesh>
              <mesh position={[0, -0.37, 0]}>
                <cylinderGeometry args={[0.17, 0.17, 0.22, 32]} />
                <Mat k="brass" />
              </mesh>
              <mesh position={[0, -0.49, 0]}>
                <cylinderGeometry args={[0.188, 0.188, 0.03, 32]} />
                <Mat k="brass" />
              </mesh>
            </group>
          ))}
        </group>
      )
    case 'flashlight':
      return (
        <group>
          <RodX r={0.14} len={1.25} x={-0.2} k="gun" />
          {[-0.62, -0.54, -0.46, -0.38, -0.3].map((x) => (
            <Ring key={x} r={0.14} tube={0.012} x={x} k="gunDark" />
          ))}
          <RodX r={0.15} r2={0.25} len={0.42} x={0.62} k="gun" />
          <RodX r={0.22} len={0.02} x={0.84} k="steel" />
          <mesh position={[0.852, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.2, 32]} />
            <meshStandardMaterial color="#fff5c8" emissive="#ffe7a0" emissiveIntensity={2.2} roughness={0.2} />
          </mesh>
          <RodX r={0.155} len={0.14} x={-0.88} k="gunDark" />
          <Box size={[0.16, 0.06, 0.1]} pos={[0.12, 0.15, 0]} k="red" radius={0.02} />
        </group>
      )
    case 'key':
      return (
        <group>
          <Ring r={0.28} tube={0.07} x={-0.62} k="rust" axis="z" />
          <RodX r={0.08} len={0.1} x={-0.3} k="rust" />
          <RodX r={0.055} len={1.0} x={0.22} k="rust" />
          <Box size={[0.1, 0.2, 0.06]} pos={[0.5, -0.12, 0]} k="rust" radius={0.01} />
          <Box size={[0.1, 0.13, 0.06]} pos={[0.68, -0.09, 0]} k="rust" radius={0.01} />
          <group position={[-1.12, -0.42, 0]} rotation={[0, 0, 0.35]}>
            <Box size={[0.5, 0.3, 0.015]} pos={[0, 0, 0]} k="paper" radius={0.005} />
            <Ring r={0.03} tube={0.008} x={0.19} k="brass" axis="z" />
          </group>
        </group>
      )
    case 'crowbar':
      return (
        <group>
          <mesh geometry={crowbar}>
            <Mat k="red" />
          </mesh>
          <Box size={[0.22, 0.05, 0.14]} pos={[0.1, -1.94, 0]} rot={[0, 0, 0.3]} k="steel" radius={0.01} />
        </group>
      )
    case 'radio':
      return (
        <group>
          <Box size={[0.9, 1.5, 0.38]} pos={[0, 0, 0]} k="radio" radius={0.09} />
          <mesh position={[0.24, 1.15, 0]}>
            <cylinderGeometry args={[0.035, 0.07, 0.9, 16]} />
            <Mat k="rubber" />
          </mesh>
          <mesh position={[-0.22, 0.83, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.16, 24]} />
            <Mat k="steel" />
          </mesh>
          <mesh position={[0, 0.42, 0.192]}>
            <planeGeometry args={[0.62, 0.28]} />
            <meshStandardMaterial map={lcd} emissive="#9fd18a" emissiveIntensity={0.35} emissiveMap={lcd} roughness={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, -0.04 - i * 0.07, 0.192]}>
              <boxGeometry args={[0.62, 0.03, 0.02]} />
              <Mat k="rubber" />
            </mesh>
          ))}
          <Box size={[0.16, 0.09, 0.05]} pos={[-0.18, -0.58, 0.19]} k="red" radius={0.02} />
          <Box size={[0.16, 0.09, 0.05]} pos={[0.18, -0.58, 0.19]} k="polymer" radius={0.02} />
          <Box size={[0.05, 0.34, 0.16]} pos={[-0.47, 0.2, 0]} k="rubber" radius={0.02} />
        </group>
      )
    case 'rope':
      return (
        <group rotation={[0.55, 0, 0]}>
          <mesh geometry={helix}>
            <Mat k="rope" />
          </mesh>
          {[0, Math.PI].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]} rotation={[0, -a, 0]}>
              <torusGeometry args={[0.3, 0.032, 8, 24]} />
              <meshStandardMaterial color="#8a6a3a" roughness={1} />
            </mesh>
          ))}
        </group>
      )
    case 'can':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.45, 0.45, 0.8, 48]} />
            <Mat k="tin" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.453, 0.453, 0.56, 48, 1, true]} />
            <meshStandardMaterial map={canLabel} roughness={0.6} />
          </mesh>
          <Ring r={0.45} tube={0.025} y={0.4} k="tin" axis="y" />
          <Ring r={0.45} tube={0.025} y={-0.4} k="tin" axis="y" />
          <Ring r={0.3} tube={0.012} y={0.405} k="tin" axis="y" />
          <Ring r={0.18} tube={0.01} y={0.405} k="tin" axis="y" />
        </group>
      )
    case 'ampoule':
      return (
        <group rotation={[0, 0, -0.35]}>
          <mesh geometry={ampoule}>
            <meshPhysicalMaterial color="#e6f3ff" roughness={0.04} metalness={0} clearcoat={1} transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <cylinderGeometry args={[0.235, 0.205, 1.08, 40]} />
            <meshStandardMaterial color="#2f86e6" emissive="#1c5fb8" emissiveIntensity={0.6} roughness={0.15} transparent opacity={0.88} />
          </mesh>
          <Ring r={0.083} tube={0.014} y={0.6} k="red" axis="y" />
        </group>
      )
  }
}

/** 子要素の外接箱を測って、原点中心・指定サイズに収める */
function Fit({ children, w = 3.4, h = 1.6 }: { children: ReactNode; w?: number; h?: number }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    const parent = g.parent
    const saved = parent ? parent.matrixWorld.clone() : null
    if (parent) parent.matrixWorld.identity()
    g.scale.setScalar(1)
    g.position.set(0, 0, 0)
    g.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(g)
    if (parent && saved) parent.matrixWorld.copy(saved)
    const sz = box.getSize(new THREE.Vector3())
    const s = Math.min(w / Math.max(sz.x, 0.001), h / Math.max(sz.y, 0.001), w / Math.max(sz.z, 0.001))
    const c = box.getCenter(new THREE.Vector3())
    g.scale.setScalar(s)
    g.position.copy(c.multiplyScalar(-s))
  })
  return <group ref={ref}>{children}</group>
}

interface Spin {
  x: number
  y: number
  vx: number
  vy: number
  zoom: number
  dragging: boolean
}

function ExamineScene({ art, spin, reduced }: { art: Art; spin: RefObject<Spin>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const appear = useRef(reduced ? 1 : 0)
  useFrame((state, dt) => {
    const s = spin.current
    const g = group.current
    if (!s || !g) return
    const d = Math.min(dt, 0.05)
    if (!s.dragging) {
      s.vx *= Math.pow(0.04, d)
      s.vy *= Math.pow(0.12, d)
      const idle = reduced ? 0 : 0.35
      s.y += (s.vy + idle) * d
      s.x += s.vx * d
      s.x += (0.18 - s.x) * Math.min(1, d * 1.5) * (Math.abs(s.vx) < 0.2 ? 1 : 0)
    }
    s.x = Math.max(-1.2, Math.min(1.2, s.x))
    g.rotation.set(s.x, s.y, 0)
    appear.current += (1 - appear.current) * Math.min(1, d * 6)
    const a = appear.current
    g.scale.setScalar(0.55 + a * 0.45)
    g.position.y = 0.32 + (1 - a) * -0.6 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.2) * 0.04)
    const cam = state.camera
    const aspect = state.size.width / Math.max(1, state.size.height)
    const baseZ = Math.max(5.4, 5.3 / aspect)
    cam.position.z += (baseZ / s.zoom - cam.position.z) * Math.min(1, d * 6)
  })
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#fff1dc" />
      <directionalLight position={[-4, 1.5, -3]} intensity={2.2} color="#8fb3ff" />
      <directionalLight position={[0, -3, 2]} intensity={0.35} color="#ffb070" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} position={[0, 4, 2]} rotation={[Math.PI / 2.4, 0, 0]} scale={[7, 2.4, 1]} color="#fff4e6" />
        <Lightformer form="rect" intensity={2.4} position={[-5, 0.8, 0]} rotation={[0, Math.PI / 2, 0]} scale={[5, 1.4, 1]} color="#9ec2ff" />
        <Lightformer form="rect" intensity={1.8} position={[5, 1, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} color="#ffd2a0" />
        <Lightformer form="ring" intensity={1.2} position={[0, 1, -5]} scale={3} color="#ffffff" />
        <Lightformer form="rect" intensity={1.3} position={[0, 0.5, 6]} rotation={[0, Math.PI, 0]} scale={[7, 3, 1]} color="#fff8ee" />
        <Lightformer form="rect" intensity={0.8} position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 8, 1]} color="#5a4430" />
      </Environment>
      <group ref={group}>
        <Fit key={art}>
          <Model3D art={art} />
        </Fit>
      </group>
      <ContactShadows position={[0, -0.95, 0]} opacity={0.55} scale={7} blur={2.6} far={3} resolution={512} color="#000000" />
    </>
  )
}

function ExamineOverlay({ inst, index, total, onClose, onStep, reduced }: { inst: Inst; index: number; total: number; onClose: () => void; onStep: (d: number) => void; reduced: boolean }) {
  const def = DEFS[inst.def]
  const spin = useRef<Spin>({ x: 0.18, y: -0.6, vx: 0, vy: 0, zoom: 1, dragging: false })
  const last = useRef({ x: 0, y: 0, t: 0 })
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // アイテムが変わるたびに、くるっと回りながら登場
    Object.assign(spin.current, { x: 0.18, y: -0.6 - (reduced ? 0 : 2.4), vx: 0, vy: reduced ? 0 : 6 })
  }, [inst.uid, reduced])
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
  }, [])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    spin.current.dragging = true
    spin.current.vx = spin.current.vy = 0
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = spin.current
    if (!s.dragging) return
    const now = performance.now()
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    const dt = Math.max(1, now - last.current.t) / 1000
    s.y += dx * 0.011
    s.x += dy * 0.011
    s.vy = (dx * 0.011) / dt
    s.vx = (dy * 0.011) / dt
    last.current = { x: e.clientX, y: e.clientY, t: now }
  }
  const onUp = () => {
    spin.current.dragging = false
  }
  const zoom = (d: number) => {
    spin.current.zoom = Math.max(0.7, Math.min(1.8, spin.current.zoom + d))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = spin.current
    const k = e.key
    if (k === 'Escape' || k === 'x' || k === 'X') onClose()
    else if (k === 'ArrowLeft') s.vy -= 2.2
    else if (k === 'ArrowRight') s.vy += 2.2
    else if (k === 'ArrowUp') s.vx -= 1.6
    else if (k === 'ArrowDown') s.vx += 1.6
    else if (k === '+' || k === '=') zoom(0.15)
    else if (k === '-') zoom(-0.15)
    else if (k === 'q' || k === 'Q' || k === 'PageUp') onStep(-1)
    else if (k === 'e' || k === 'E' || k === 'PageDown') onStep(1)
    else if (k === 'Tab') return
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const btn =
    'grid size-8 place-items-center rounded-full border border-[#c9a46a]/40 bg-black/45 text-[#f3e6c4] outline-none backdrop-blur hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-[#ffcf6a]'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${def.name}を調べる`}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.stopPropagation()}
      className="ginv-examine absolute inset-0 z-[70] overflow-hidden bg-[#070605]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,#3a2c1c_0%,#14100b_45%,#050404_80%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(transparent,rgba(0,0,0,.6))]" />
      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => Object.assign(spin.current, { x: 0.18, y: -0.6, vx: 0, vy: 0, zoom: 1 })}
      >
        <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.25, 5.4], fov: 34 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
          <ExamineScene art={inst.def} spin={spin} reduced={reduced} />
        </Canvas>
      </div>

      {/* 情報 */}
      <div className="pointer-events-none absolute top-3 left-4 right-14">
        <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[.5em] text-[#c9a46a]">EXAMINE</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#f6ead0] [text-shadow:0_2px_12px_rgba(0,0,0,.8)] @min-[40rem]:text-2xl">{def.name}</h3>
          <span className="rounded px-1.5 py-px text-[9px] font-bold text-white" style={{ background: CATEGORY_COLOR[def.category] }}>
            {def.category}
          </span>
          <span className="font-mono text-[10px] text-[#a8987a]">
            {def.w}×{def.h}
            {inst.count !== undefined ? ` ・ ×${inst.count}` : ''}
          </span>
        </div>
      </div>
      <button ref={closeRef} type="button" onClick={onClose} className={`${btn} absolute top-3 right-3`} aria-label="閉じる（Esc）">
        <X size={15} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-[var(--solo-footer-clearance,0.75rem)] flex flex-col items-center gap-2 px-4">
        <p className="max-w-[34rem] rounded-md bg-black/35 px-3 py-1 text-center text-[12px] leading-relaxed text-[#e2d6bb] backdrop-blur-[2px] [text-shadow:0_1px_6px_#000]">{def.desc}</p>
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => onStep(-1)} aria-label="前のアイテム（Q）">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[3.5rem] text-center font-mono text-[10px] text-[#a8987a]">
            {index + 1} / {total}
          </span>
          <button type="button" className={btn} onClick={() => onStep(1)} aria-label="次のアイテム（E）">
            <ChevronRight size={16} />
          </button>
          <span className="mx-1 h-4 w-px bg-white/15" />
          <button type="button" className={btn} onClick={() => zoom(-0.2)} aria-label="縮小">
            <ZoomOut size={14} />
          </button>
          <button type="button" className={btn} onClick={() => zoom(0.2)} aria-label="拡大">
            <ZoomIn size={14} />
          </button>
        </div>
        <p className="hidden font-mono text-[9px] tracking-wider text-[#8a7c62] @min-[36rem]:block">ドラッグ / 矢印キーで回転 ・ ダブルクリックで戻す ・ Q / E で切り替え ・ Esc で閉じる</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

interface Drag {
  uid: string
  rot: boolean
  fx: number
  fy: number
  startX: number
  startY: number
  clientX: number
  clientY: number
  moved: boolean
  cell: number
  ghostX: number
  ghostY: number
  preview: { gx: number; gy: number; w: number; h: number } | null
  overFloor: boolean
}

type Tone = 'info' | 'ok' | 'warn'

export function GridInventory() {
  const reduced = !!useReducedMotion()
  const [items, setItems] = useState<Inst[]>(INITIAL)
  const [selected, setSelected] = useState<string | null>('i1')
  const [drag, setDrag] = useState<Drag | null>(null)
  const [animating, setAnimating] = useState(false)
  const [status, setStatus] = useState<{ text: string; tone: Tone; key: number } | null>(null)
  const [shake, setShake] = useState<{ uid: string; key: number } | null>(null)
  const [examine, setExamine] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const floorRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const timers = useRef<number[]>([])
  const shakeKey = useRef(0)
  const statusKey = useRef(0)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // キーボード操作で親が変わったアイテムにフォーカスを戻す
  useEffect(() => {
    const uid = pendingFocus.current
    if (!uid) return
    pendingFocus.current = null
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-uid="${uid}"]`)?.focus({ preventScroll: true })
  }, [items])

  /** 描画済みグリッドの実寸から1マスの px を得る（CSS で決まるため） */
  const cellPx = () => {
    const g = gridRef.current
    return g ? g.getBoundingClientRect().width / COLS : 40
  }
  const setDragBoth = (d: Drag | null) => {
    dragRef.current = d
    setDrag(d)
  }
  const say = (text: string, tone: Tone = 'info') => {
    const key = ++statusKey.current
    setStatus({ text, tone, key })
    later(() => setStatus((st) => (st && st.key === key ? null : st)), 2600)
  }
  const bump = (uid: string) => {
    const key = ++shakeKey.current
    setShake({ uid, key })
    later(() => setShake((sh) => (sh && sh.key === key ? null : sh)), 420)
  }
  const flashAnim = (ms = 450) => {
    setAnimating(true)
    later(() => setAnimating(false), ms)
  }

  const usedCells = items.filter((i) => i.loc === 'case').reduce((s, i) => s + DEFS[i.def].w * DEFS[i.def].h, 0)
  const sel = items.find((i) => i.uid === selected) ?? null

  /* ---------------- drag ---------------- */

  const locate = (d: Drag, clientX: number, clientY: number): Drag => {
    const inst = items.find((i) => i.uid === d.uid)
    const root = rootRef.current?.getBoundingClientRect()
    if (!inst || !root) return d
    const [fw, fh] = dims(inst, d.rot)
    const cell = d.cell
    const left = clientX - d.fx * fw * cell
    const top = clientY - d.fy * fh * cell
    const g = gridRef.current?.getBoundingClientRect()
    const f = floorRef.current?.getBoundingClientRect()
    let preview: Drag['preview'] = null
    const m = cell / 2
    if (g && clientX >= g.left - m && clientX <= g.right + m && clientY >= g.top - m && clientY <= g.bottom + m) {
      preview = { gx: Math.round((left - g.left) / cell), gy: Math.round((top - g.top) / cell), w: fw, h: fh }
    }
    const overFloor = !preview && !!f && clientX >= f.left && clientX <= f.right && clientY >= f.top && clientY <= f.bottom
    return { ...d, clientX, clientY, ghostX: left - root.left, ghostY: top - root.top, preview, overFloor }
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, inst: Inst) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus({ preventScroll: true })
    setSelected(inst.uid)
    setDragBoth({
      uid: inst.uid,
      rot: inst.rot,
      fx: (e.clientX - rect.left) / rect.width,
      fy: (e.clientY - rect.top) / rect.height,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      moved: false,
      cell: cellPx(),
      ghostX: 0,
      ghostY: 0,
      preview: null,
      overFloor: false,
    })
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4
    if (!moved) return
    setDragBoth(locate({ ...d, moved }, e.clientX, e.clientY))
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragBoth(null)
    const inst = items.find((i) => i.uid === d.uid)
    if (!d.moved || !inst) return
    const name = DEFS[inst.def].name
    const p = d.preview
    if (p && fits(items, d.uid, p.gx, p.gy, p.w, p.h)) {
      setItems((list) => list.map((it) => (it.uid === d.uid ? { ...it, loc: 'case', x: p.gx, y: p.gy, rot: d.rot } : it)))
      say(`${name}をケースにしまった`, 'ok')
    } else if (d.overFloor) {
      setItems((list) => {
        const it = list.find((i) => i.uid === d.uid)
        if (!it) return list
        return [...list.filter((i) => i.uid !== d.uid), { ...it, loc: 'floor', rot: d.rot }]
      })
      say(`${name}を足元に置いた`, 'info')
    } else {
      if (p) say('そこには置けません', 'warn')
      bump(d.uid)
    }
  }

  const cancelDrag = () => {
    const d = dragRef.current
    if (!d) return
    setDragBoth(null)
    if (d.moved) bump(d.uid)
  }

  /* ---------------- actions ---------------- */

  const rotate = (uid: string | null) => {
    const d = dragRef.current
    if (d && d.moved) {
      // 指の位置を中心に90度回す（オフセットも回転させる）
      const nd: Drag = d.rot ? { ...d, rot: false, fx: d.fy, fy: 1 - d.fx } : { ...d, rot: true, fx: 1 - d.fy, fy: d.fx }
      setDragBoth(locate(nd, d.clientX, d.clientY))
      return
    }
    const it = items.find((i) => i.uid === uid)
    if (!it) return
    const def = DEFS[it.def]
    if (def.w === def.h) {
      say(`${def.name}は回しても同じ形です`, 'info')
      return
    }
    if (it.loc === 'floor') {
      setItems((list) => list.map((i) => (i.uid === it.uid ? { ...i, rot: !i.rot } : i)))
      return
    }
    const [w, h] = dims(it, !it.rot)
    // その場で回せなければ、近い位置を探す
    let best: { x: number; y: number; dist: number } | null = null
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (!fits(items, it.uid, x, y, w, h)) continue
        const dist = Math.abs(x - it.x) + Math.abs(y - it.y)
        if (!best || dist < best.dist) best = { x, y, dist }
      }
    if (!best || best.dist > 3) {
      say('回転できるスペースがありません', 'warn')
      bump(it.uid)
      return
    }
    const spot = best
    flashAnim(260)
    setItems((list) => list.map((i) => (i.uid === it.uid ? { ...i, rot: !i.rot, x: spot.x, y: spot.y } : i)))
  }

  const moveBy = (uid: string, dx: number, dy: number) => {
    const it = items.find((i) => i.uid === uid)
    if (!it || it.loc !== 'case') return
    const [w, h] = dims(it)
    if (!fits(items, uid, it.x + dx, it.y + dy, w, h)) {
      bump(uid)
      return
    }
    flashAnim(160)
    setItems((list) => list.map((i) => (i.uid === uid ? { ...i, x: i.x + dx, y: i.y + dy } : i)))
  }

  const toggleLocation = (uid: string) => {
    const it = items.find((i) => i.uid === uid)
    if (!it) return
    const name = DEFS[it.def].name
    pendingFocus.current = uid
    if (it.loc === 'case') {
      setItems((list) => [...list.filter((i) => i.uid !== uid), { ...it, loc: 'floor' }])
      say(`${name}を足元に置いた`, 'info')
      return
    }
    const spot = findSpot(items, it, false)
    if (!spot) {
      pendingFocus.current = null
      say('ケースに空きがありません。「整理する」を試してください', 'warn')
      bump(uid)
      return
    }
    setItems((list) => list.map((i) => (i.uid === uid ? { ...i, loc: 'case', ...spot } : i)))
    say(`${name}をケースにしまった`, 'ok')
  }

  const organize = () => {
    const packed = pack(items)
    if (!packed) {
      say('これ以上うまく詰められません', 'warn')
      return
    }
    flashAnim(reduced ? 10 : 520)
    setItems(packed)
    // 足元のアイテムが入るなら案内
    const fitsMore = packed.filter((i) => i.loc === 'floor').some((i) => findSpot(packed, i) !== null)
    say(`整理しました。空き ${COLS * ROWS - usedCells} マス${fitsMore ? ' ・ 足元のアイテムも入りそうです' : ''}`, 'ok')
  }

  const reset = () => {
    setDragBoth(null)
    setItems(INITIAL)
    setSelected('i1')
    say('ケースを最初の状態に戻しました', 'info')
  }

  const examineList = [...items.filter((i) => i.loc === 'case'), ...items.filter((i) => i.loc === 'floor')]
  const openExamine = (uid: string | null) => {
    if (!uid || dragRef.current?.moved) return
    setSelected(uid)
    setExamine(uid)
  }
  const closeExamine = () => {
    const uid = examine
    setExamine(null)
    window.requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>(`[data-uid="${uid}"]`)?.focus({ preventScroll: true }))
  }
  const stepExamine = (d: number) => {
    const i = examineList.findIndex((it) => it.uid === examine)
    const next = examineList[(i + d + examineList.length) % examineList.length]
    if (next) {
      setExamine(next.uid)
      setSelected(next.uid)
    }
  }

  /* ---------------- input ---------------- */

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    if (examine) return
    if (k === 'x' || k === 'X') {
      openExamine(selected)
      e.preventDefault()
    } else if (k === 'r' || k === 'R') {
      rotate(selected)
      e.preventDefault()
    } else if (k === 'Escape' && dragRef.current) {
      cancelDrag()
      e.preventDefault()
    } else if (k.startsWith('Arrow')) {
      e.preventDefault()
      if (!selected || dragRef.current) return
      const [dx, dy] = k === 'ArrowLeft' ? [-1, 0] : k === 'ArrowRight' ? [1, 0] : k === 'ArrowUp' ? [0, -1] : [0, 1]
      moveBy(selected, dx, dy)
    }
  }

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-uid]')
    if (dragRef.current?.moved) {
      e.preventDefault()
      rotate(null)
      return
    }
    if (target) {
      e.preventDefault()
      const uid = target.dataset.uid ?? null
      setSelected(uid)
      rotate(uid)
    }
  }

  /* ---------------- render helpers ---------------- */

  const tile = (inst: Inst, inCase: boolean) => {
    const [fw, fh] = dims(inst)
    const u = inCase ? 'var(--cell)' : 'var(--fu)'
    const isSel = selected === inst.uid
    const dragging = drag?.uid === inst.uid && drag.moved
    const def = DEFS[inst.def]
    return (
      <button
        key={inst.uid}
        type="button"
        data-uid={inst.uid}
        aria-label={`${def.name}（${fw}×${fh}）${inCase ? `ケースの ${inst.x + 1}列 ${inst.y + 1}行` : '足元'}`}
        onPointerDown={(e) => onPointerDown(e, inst)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelDrag}
        onDoubleClick={() => openExamine(inst.uid)}
        onFocus={() => setSelected(inst.uid)}
        onClick={(e) => {
          if (e.detail === 0) toggleLocation(inst.uid)
        }}
        className={`group touch-none rounded-[5px] outline-none select-none ${inCase ? 'absolute' : 'relative shrink-0'} ${
          animating && inCase ? 'motion-safe:transition-[left,top,width,height] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(.2,.9,.3,1)]' : ''
        } ${dragging ? 'opacity-25' : ''} cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#ffcf6a]`}
        style={
          inCase
            ? { left: `calc(var(--cell) * ${inst.x})`, top: `calc(var(--cell) * ${inst.y})`, width: `calc(var(--cell) * ${fw})`, height: `calc(var(--cell) * ${fh})` }
            : { width: `calc(var(--fu) * ${fw})`, height: `calc(var(--fu) * ${fh})` }
        }
      >
        <div
          key={shake?.uid === inst.uid ? shake.key : 0}
          className={`absolute inset-[2px] overflow-hidden rounded-[4px] border transition-colors ${
            isSel
              ? 'border-[#ffcf6a] bg-[#ffcf6a]/14 shadow-[0_0_0_1px_#ffcf6a,0_0_14px_rgba(255,190,80,.35)]'
              : 'border-white/12 bg-white/[.04] group-hover:border-white/30 group-hover:bg-white/[.08]'
          } ${shake?.uid === inst.uid ? 'ginv-shake' : ''}`}
        >
          <Rotated inst={inst} unit={u} />
          {inst.count !== undefined && (
            <span className="absolute right-0.5 bottom-0 font-mono text-[10px] font-bold text-[#f3e6c4] [text-shadow:0_1px_2px_#000]">{inst.count}</span>
          )}
        </div>
      </button>
    )
  }

  const dragInst = drag?.moved ? items.find((i) => i.uid === drag.uid) : undefined
  const preview = drag?.moved ? drag.preview : null
  const previewValid = preview ? fits(items, drag!.uid, preview.gx, preview.gy, preview.w, preview.h) : false
  const caseItems = items.filter((i) => i.loc === 'case')
  const floorItems = items.filter((i) => i.loc === 'floor')
  const toneStyle = status?.tone === 'warn' ? 'border-[#e5604d]/70 text-[#ffb3a3]' : status?.tone === 'ok' ? 'border-[#6ee08a]/60 text-[#bff0c8]' : 'border-white/20 text-[#e9dfc9]'

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
      className="@container relative flex h-full w-full flex-col gap-2 overflow-hidden bg-[#15120e] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] font-sans text-[#e9dfc9] outline-none select-none [background-image:radial-gradient(ellipse_at_30%_0%,rgba(255,190,110,.16),transparent_60%),radial-gradient(ellipse_at_50%_120%,rgba(0,0,0,.6),transparent_60%),repeating-linear-gradient(90deg,rgba(255,255,255,.015)_0_2px,transparent_2px_7px)]"
    >
      <style>{`
        @keyframes ginv-shake { 0%,100% { translate: 0 0 } 20% { translate: -4px 0 } 40% { translate: 4px 0 } 60% { translate: -3px 0 } 80% { translate: 2px 0 } }
        .ginv-shake { animation: ginv-shake .34s ease; border-color: #e5604d !important; }
        @keyframes ginv-toast { from { opacity: 0; translate: 0 -6px } to { opacity: 1; translate: 0 0 } }
        .ginv-toast { animation: ginv-toast .2s ease-out; }
        @keyframes ginv-examine { from { opacity: 0; clip-path: inset(45% 0 45% 0) } to { opacity: 1; clip-path: inset(0 0 0 0) } }
        .ginv-examine { animation: ginv-examine .38s cubic-bezier(.2,.9,.3,1); }
        @media (prefers-reduced-motion: reduce) { :root:not([data-motion=full]) .ginv-shake,:root:not([data-motion=full]) .ginv-toast,:root:not([data-motion=full]) .ginv-examine { animation: none; } } :root[data-motion=reduce] .ginv-shake,:root[data-motion=reduce] .ginv-toast,:root[data-motion=reduce] .ginv-examine { animation: none; }
      `}</style>
      <GradientDefs />

      {/* ヘッダー */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-['Space_Grotesk'] text-[13px] font-bold tracking-[.35em] text-[#f3e6c4]">ATTACHÉ CASE</h2>
          <span className="hidden text-[10px] font-bold tracking-widest text-[#a8987a] @min-[30rem]:inline">アタッシュケース</span>
        </div>
        <div className="hidden items-center gap-1.5 @min-[30rem]:flex" aria-label={`使用 ${usedCells} / ${COLS * ROWS} マス`}>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 @min-[36rem]:w-24">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7a9a5a] to-[#d2b25a] motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${(usedCells / (COLS * ROWS)) * 100}%` }} />
          </div>
          <span className="font-mono text-[10px] text-[#c9bc9c] tabular-nums">
            {usedCells}/{COLS * ROWS}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => rotate(selected)}
            disabled={!sel}
            title="回転（R）"
            className="grid size-7 place-items-center rounded-md border border-[#6d5a3e] bg-[#2a2219] text-[#e9dfc9] outline-none hover:bg-[#3a2f22] focus-visible:ring-2 focus-visible:ring-[#ffcf6a] disabled:opacity-40"
          >
            <RotateCw size={14} aria-hidden="true" />
            <span className="sr-only">選択中のアイテムを回転</span>
          </button>
          <button
            type="button"
            onClick={() => openExamine(selected)}
            disabled={!sel}
            className="flex h-7 items-center gap-1.5 rounded-md border border-[#6d5a3e] bg-[#2a2219] px-2 text-[11px] font-bold tracking-wider text-[#e9dfc9] outline-none hover:bg-[#3a2f22] focus-visible:ring-2 focus-visible:ring-[#ffcf6a] disabled:opacity-40"
          >
            <Search size={13} aria-hidden="true" />
            <span className="hidden @min-[30rem]:inline">調べる</span>
            <span className="sr-only @min-[30rem]:hidden">調べる</span>
          </button>
          <button
            type="button"
            onClick={organize}
            className="flex h-7 items-center gap-1.5 rounded-md border border-[#b8924f] bg-[linear-gradient(#4a3a24,#2e2417)] px-2.5 text-[11px] font-bold tracking-wider text-[#f3e0b0] shadow-[inset_0_1px_0_rgba(255,230,170,.25)] outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#ffcf6a] active:translate-y-px"
          >
            <LayoutGrid size={13} aria-hidden="true" />
            整理する
          </button>
          <button
            type="button"
            onClick={reset}
            title="リセット"
            className="grid size-7 place-items-center rounded-md border border-[#6d5a3e] bg-[#2a2219] text-[#e9dfc9] outline-none hover:bg-[#3a2f22] focus-visible:ring-2 focus-visible:ring-[#ffcf6a]"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span className="sr-only">リセット</span>
          </button>
        </div>
      </div>

      {/* 本体 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:gap-3">
        <div className="relative grid min-h-0 min-w-0 flex-1 place-items-center [container-type:size]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center" role="status" aria-live="polite">
            {status && (
              <span key={status.key} className={`ginv-toast max-w-[90%] truncate rounded-full border bg-[#0d0b08]/85 px-3 py-1 text-[11px] font-bold shadow-lg backdrop-blur ${toneStyle}`}>
                {status.text}
              </span>
            )}
          </div>
          {/* 革のケース */}
          <div
            className="relative rounded-[16px] bg-[#4a2c1a] shadow-[0_18px_40px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,220,170,.18),inset_0_-3px_0_rgba(0,0,0,.35)] [background-image:radial-gradient(rgba(255,255,255,.05)_1px,transparent_1.2px),radial-gradient(rgba(0,0,0,.18)_1px,transparent_1.4px),linear-gradient(160deg,#5b3722,#3a2214_70%)] [background-position:0_0,3px_2px,0_0] [background-size:5px_5px,7px_7px,100%_100%]"
            style={{ padding: FRAME - 4, ['--cell' as string]: `clamp(18px, min((100cqw - ${FRAME * 2 + 4}px) / ${COLS}, (100cqh - ${FRAME * 2 + 4}px) / ${ROWS}), 84px)` }}
          >
            {/* ランプの光と内側の陰 */}
            <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[radial-gradient(ellipse_at_22%_-10%,rgba(255,214,150,.22),transparent_55%),radial-gradient(ellipse_at_50%_120%,rgba(0,0,0,.35),transparent_60%)]" />
            {/* ステッチ */}
            <div className="pointer-events-none absolute inset-[5px] rounded-[12px] border border-dashed border-[#d6b07a]/45" />
            {/* 金具 */}
            {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((p) => (
              <span key={p} className={`pointer-events-none absolute size-4 rounded-[5px] bg-[linear-gradient(135deg,#f2dca0,#9a7a3a)] shadow-[0_1px_2px_rgba(0,0,0,.6)] ${p}`} />
            ))}
            {['left-[28%]', 'right-[28%]'].map((p) => (
              <span key={p} className={`pointer-events-none absolute -top-1.5 h-2.5 w-7 rounded-sm bg-[linear-gradient(#f2dca0,#8a6a2a)] shadow-[0_1px_2px_rgba(0,0,0,.6)] ${p}`} />
            ))}
            <div
              ref={gridRef}
              className="relative overflow-hidden rounded-[4px] bg-[#1d1c19] shadow-[inset_0_3px_10px_rgba(0,0,0,.8)] ring-2 ring-[#1a0f08]"
              style={{
                width: `calc(var(--cell) * ${COLS})`,
                height: `calc(var(--cell) * ${ROWS})`,
                backgroundImage: `linear-gradient(rgba(214,190,140,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(214,190,140,.13) 1px, transparent 1px), radial-gradient(ellipse at 40% 0%, rgba(255,210,150,.08), transparent 70%)`,
                backgroundSize: 'var(--cell) var(--cell), var(--cell) var(--cell), 100% 100%',
              }}
              role="group"
              aria-label={`アタッシュケース ${COLS}×${ROWS}マス`}
            >
              {preview && (
                <div
                  className={`pointer-events-none absolute z-10 rounded-[4px] border-2 ${previewValid ? 'border-[#6ee08a] bg-[#3fbf5f]/30' : 'border-[#ff6a55] bg-[#e5402d]/30'}`}
                  style={{ left: `calc(var(--cell) * ${preview.gx})`, top: `calc(var(--cell) * ${preview.gy})`, width: `calc(var(--cell) * ${preview.w})`, height: `calc(var(--cell) * ${preview.h})` }}
                />
              )}
              {caseItems.map((i) => tile(i, true))}
            </div>
          </div>
        </div>

        {/* 足元 */}
        <div
          ref={floorRef}
          className={`flex shrink-0 flex-col rounded-xl border border-dashed p-2 transition-colors [--fu:16px] @min-[44rem]:w-[calc(var(--fu)*4+2.25rem)] @min-[44rem]:[--fu:30px] @min-[72rem]:[--fu:38px] ${
            drag?.overFloor ? 'border-[#ffcf6a] bg-[#ffcf6a]/10' : 'border-[#6d5a3e] bg-black/25'
          }`}
        >
          <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold tracking-[.2em] text-[#c9bc9c]">足元 ― ひろったもの</span>
            <span className="font-mono text-[10px] text-[#8a7c62]">{floorItems.length}</span>
          </div>
          <div className="flex min-h-0 flex-1 content-start items-end gap-1.5 overflow-auto [scrollbar-width:thin] @min-[44rem]:flex-wrap @min-[44rem]:items-start">
            {floorItems.length === 0 ? (
              <p className="m-auto text-center text-[11px] text-[#8a7c62]">ここにドラッグすると<br />ケースから出せます</p>
            ) : (
              floorItems.map((i) => tile(i, false))
            )}
          </div>
        </div>
      </div>

      {/* 説明パネル */}
      <div className="flex h-[64px] shrink-0 items-center gap-3 rounded-lg border border-[#5a4a32] bg-[linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.3))] px-3">
        {sel ? (
          <>
            <div className="relative size-11 shrink-0 rounded-md border border-white/10 bg-black/40">
              <div className="absolute inset-1">
                <ItemArt art={sel.def} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-bold text-[#f3e6c4]">{DEFS[sel.def].name}</span>
                <span className="shrink-0 rounded px-1.5 py-px text-[9px] font-bold text-white" style={{ background: CATEGORY_COLOR[DEFS[sel.def].category] }}>
                  {DEFS[sel.def].category}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[#a8987a]">
                  {dims(sel).join('×')}
                  {sel.count !== undefined ? ` ・ ×${sel.count}` : ''}
                </span>
                <span className="ml-auto hidden shrink-0 font-mono text-[9px] tracking-wider text-[#8a7c62] @min-[44rem]:inline">X・ダブルクリック 調べる ／ R・右クリック 回転 ／ Enter 出し入れ</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#c9bc9c]">{DEFS[sel.def].desc}</p>
            </div>
          </>
        ) : (
          <p className="text-[11px] font-bold text-[#c9bc9c]">アイテムをドラッグして配置。R キーか右クリックで回転できます。</p>
        )}
      </div>

      {/* ドラッグ中のゴースト */}
      {drag && dragInst && (
        <div
          className="pointer-events-none absolute z-50 rounded-[5px] border border-[#ffcf6a]/80 bg-[#2a2219]/70 shadow-[0_14px_30px_rgba(0,0,0,.6)]"
          style={{ left: drag.ghostX, top: drag.ghostY, width: dims(dragInst, drag.rot)[0] * drag.cell, height: dims(dragInst, drag.rot)[1] * drag.cell }}
        >
          <Rotated inst={{ ...dragInst, rot: drag.rot }} unit={`${drag.cell}px`} />
        </div>
      )}

      {/* 3D で調べる */}
      {examine && (() => {
        const inst = items.find((i) => i.uid === examine)
        if (!inst) return null
        return (
          <ExamineOverlay
            inst={inst}
            index={examineList.findIndex((i) => i.uid === examine)}
            total={examineList.length}
            onClose={closeExamine}
            onStep={stepExamine}
            reduced={reduced}
          />
        )
      })()}
    </div>
  )
}
