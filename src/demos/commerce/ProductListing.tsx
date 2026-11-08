import NumberFlow from '@number-flow/react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from 'motion/react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Heart,
  LayoutGrid,
  List,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Truck,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

/**
 * 架空のライフスタイルストア「TOMOSHI」の商品一覧(ファセット検索)。店名・商品・画像はすべてオリジナル。
 * - 商品は 36 点の固定データ。画像は種類ごと(T シャツ・シャツ・ニット・アウター・トート・バックパック・ショルダー・マグ・キャップ・ソックス)の
 *   インライン SVG で、色 ID を渡すと本体色と陰色・背景の淡色が切り替わる。カラーで絞り込むと、カードはその色のバリエーションを先に見せる
 * - 絞り込み条件は 1 つの state(カテゴリ/価格帯/カラー/サイズ/評価/在庫あり/セール/キーワード)。各ファセットの件数は
 *   「そのファセット自身以外の条件」で数え直すので、選ぶたびに他の候補の件数がライブに変わり、0 件の候補は薄く無効になる
 * - 価格帯は自作の 2 つのつまみのスライダー(Pointer Capture でドラッグ、矢印/PageUp/Home/End キー対応、role="slider")。
 *   背後に 1,000 円刻みのヒストグラムを敷き、範囲内のバーだけアクセント色にする
 * - ルートは @container。768px 未満ではサイドバーが消え、「絞り込み」ボタンから左のドロワーで同じパネルを開く(Esc/背景で閉じる)
 * - 選択中の条件はチップで並び、× で個別に外せる。件数は @number-flow/react で桁が回り、並び替え・絞り込み・グリッド/リスト切替は
 *   Motion の layout + AnimatePresence(popLayout)でカードが滑らかに移動・出入りする
 * - 「もっと見る」はスケルトンを一瞬見せてから 8 件追加。0 件になると「〇〇を外す(+n 件)」の提案と人気キーワードを出す空状態
 * - カードの目のアイコン(または画像)でクイックビュー。カラー/サイズ(在庫数・品切れ)/数量を選んでカートに追加、ヘッダーのバッジが弾む。
 *   ハートはお気に入り。モーダルは Tab をモーダル内で循環させ、閉じると元のボタンへフォーカスを戻す
 * - キー操作はデモ内にフォーカスがあるときだけ(ルートの onKeyDown)。useReducedMotion 時はレイアウト移動やスライドをやめ短いフェードだけにする
 */

/* ───────────── データ ───────────── */

type ColorId = 'white' | 'black' | 'gray' | 'navy' | 'olive' | 'beige' | 'terracotta' | 'mustard'
type SizeId = 'S' | 'M' | 'L' | 'XL' | 'F'
type Kind = 'tee' | 'shirt' | 'knit' | 'outer' | 'tote' | 'backpack' | 'shoulder' | 'mug' | 'cap' | 'socks'
type ParentId = 'wear' | 'bag' | 'goods'
type CatId = 'all' | ParentId | Kind
type SortId = 'recommended' | 'new' | 'price-asc' | 'price-desc' | 'rating'

const COLORS: Record<ColorId, { label: string; hex: string; shade: string; bg: string }> = {
  white: { label: 'ホワイト', hex: '#f6f3ec', shade: '#c9c2b4', bg: '#ebe7de' },
  black: { label: 'ブラック', hex: '#2b2a2d', shade: '#131215', bg: '#e4e2e0' },
  gray: { label: 'グレー', hex: '#9ea0a3', shade: '#6f7174', bg: '#eceded' },
  navy: { label: 'ネイビー', hex: '#2e4163', shade: '#1b2840', bg: '#e3e7ee' },
  olive: { label: 'オリーブ', hex: '#727748', shade: '#4f5330', bg: '#ebecdf' },
  beige: { label: 'ベージュ', hex: '#dbc8a4', shade: '#b29c74', bg: '#f3ede2' },
  terracotta: { label: 'テラコッタ', hex: '#c1653f', shade: '#8f4428', bg: '#f5e6de' },
  mustard: { label: 'マスタード', hex: '#d6a53c', shade: '#a77c22', bg: '#f6eed8' },
}
const COLOR_ORDER: ColorId[] = ['white', 'black', 'gray', 'navy', 'olive', 'beige', 'terracotta', 'mustard']
const SIZE_ORDER: SizeId[] = ['S', 'M', 'L', 'XL', 'F']
const SIZE_NOTE: Partial<Record<SizeId, string>> = { F: 'フリー' }

const TREE: { id: ParentId; label: string; children: { id: Kind; label: string }[] }[] = [
  {
    id: 'wear',
    label: 'ウェア',
    children: [
      { id: 'tee', label: 'Tシャツ・カットソー' },
      { id: 'shirt', label: 'シャツ' },
      { id: 'knit', label: 'ニット' },
      { id: 'outer', label: 'アウター' },
    ],
  },
  {
    id: 'bag',
    label: 'バッグ',
    children: [
      { id: 'tote', label: 'トートバッグ' },
      { id: 'backpack', label: 'バックパック' },
      { id: 'shoulder', label: 'ショルダー' },
    ],
  },
  {
    id: 'goods',
    label: '雑貨',
    children: [
      { id: 'mug', label: 'マグ' },
      { id: 'cap', label: 'キャップ' },
      { id: 'socks', label: 'ソックス' },
    ],
  },
]
const PARENT_OF = Object.fromEntries(TREE.flatMap((t) => t.children.map((c) => [c.id, t.id]))) as Record<Kind, ParentId>
const CAT_LABEL: Record<string, string> = {
  all: 'すべての商品',
  ...Object.fromEntries(TREE.flatMap((t) => [[t.id, t.label], ...t.children.map((c) => [c.id, c.label])])),
}

type Product = {
  id: string
  kind: Kind
  name: string
  price: number
  was: number
  colors: ColorId[]
  sizes: SizeId[]
  stock: Partial<Record<SizeId, number>>
  rating: number
  reviews: number
  isNew: boolean
  pop: number
  added: number
  desc: string
}

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

// [種類, 名前, 価格, 元値(0=セールなし), 色, 評価, レビュー数, フラグ, 説明]
const RAW: [Kind, string, number, number, string, number, number, '' | 'new' | 'sold' | 'low', string][] = [
  ['tee', 'オーガニックコットン ヘビーT', 4400, 0, 'white black gray olive', 4.6, 212, '', 'しっかり肉厚な 7.4oz の天竺。首まわりはヘタりにくい二重ステッチ。'],
  ['tee', 'ガーメントダイ ポケットT', 5280, 0, 'terracotta mustard beige', 4.4, 98, 'new', '製品染めならではの、着込んだような柔らかな色味。'],
  ['tee', 'ワッフル ロングスリーブT', 5940, 0, 'white navy gray', 4.3, 76, '', '凹凸のあるワッフル編みで、一枚でも重ね着でも。'],
  ['tee', 'スーピマ クルーネックT', 3960, 4950, 'white black navy', 4.7, 341, '', '光沢のある超長綿。インナーにも使える定番の一枚。'],
  ['tee', 'ヘンリーネック ロングT', 6380, 0, 'gray olive', 4.1, 42, '', '3 つボタンの前立てが効いた、ゆったりシルエット。'],
  ['shirt', 'リネン バンドカラーシャツ', 9900, 0, 'white beige navy', 4.5, 154, '', 'リネン 100%。洗うほどに肌になじむ、さらりとした一枚。'],
  ['shirt', 'オックスフォード BDシャツ', 8580, 10780, 'white navy', 4.6, 233, '', '少し厚手のオックスフォード。襟がきれいにロールする。'],
  ['shirt', 'コーデュロイ オーバーシャツ', 12100, 0, 'olive terracotta beige', 4.4, 37, 'new', '細畝コーデュロイのシャツジャケット。羽織りとしても。'],
  ['shirt', 'シアサッカー 半袖シャツ', 7700, 9900, 'navy white', 4.2, 64, 'low', '凹凸のある生地で肌離れがよく、汗ばむ日も快適。'],
  ['knit', 'メリノウール クルーネックニット', 13200, 0, 'gray navy mustard', 4.8, 189, '', 'チクチクしにくい極細メリノ。自宅で洗えるウォッシャブル仕様。'],
  ['knit', '畦編み カーディガン', 15400, 0, 'beige black', 4.5, 71, '', 'ふっくらとした畦編み。くるみボタンがアクセント。'],
  ['knit', 'モヘア混 ショートニット', 11000, 0, 'terracotta beige', 4.3, 52, 'sold', 'ふんわり起毛したモヘア混。短め丈でボトムを選ばない。'],
  ['knit', 'ラムウール Vネックベスト', 9680, 0, 'navy mustard', 4.0, 23, 'new', 'シャツに重ねるだけで季節感が出る、ラムウールのベスト。'],
  ['outer', '撥水 マウンテンパーカー', 19800, 0, 'olive black navy', 4.6, 128, '', '撥水加工のタフな生地。フードは襟の中に収納できる。'],
  ['outer', 'ウールブレンド ステンカラーコート', 24200, 0, 'gray beige', 4.7, 58, 'new', 'ウール混の軽いメルトン。ゆとりのある肩まわり。'],
  ['outer', 'キルティング ライナージャケット', 14300, 17600, 'black olive mustard', 4.4, 91, '', '単体でもコートの下にも。軽くて暖かい中わた入り。'],
  ['outer', 'リップストップ ダウンベスト', 17600, 0, 'black navy', 4.2, 33, 'low', '薄手で着ぶくれしない。春秋はアウターの中に。'],
  ['tote', '帆布トート L', 6600, 0, 'beige black navy', 4.7, 402, '', '10 号帆布の丈夫なトート。A4 ファイルもすっぽり。'],
  ['tote', 'キャンバス ミニトート', 3850, 0, 'beige terracotta mustard', 4.5, 187, '', 'お弁当や財布だけの日に。内ポケット付き。'],
  ['tote', 'レザーハンドル トート', 11000, 0, 'black beige', 4.6, 45, 'new', '持ち手は使うほどに色が深まるヌメ革。'],
  ['tote', 'パッカブル エコバッグ', 1650, 0, 'olive gray navy', 4.3, 268, '', '手のひらサイズにたためる軽量ナイロン。'],
  ['backpack', 'デイパック 18L', 12100, 0, 'black navy olive', 4.6, 156, '', 'PC スリーブ付き。通勤にも週末にもちょうどいい容量。'],
  ['backpack', 'ロールトップ バックパック', 15950, 0, 'black gray', 4.4, 62, '', '荷物に合わせて容量を変えられるロールトップ。止水ファスナー。'],
  ['shoulder', 'ナイロン サコッシュ', 3300, 0, 'black olive mustard', 4.2, 143, '', 'スマホと財布が入る、ちょうどいいサイズ。'],
  ['shoulder', 'レザー ミニショルダー', 14850, 0, 'black terracotta', 4.8, 39, 'low', 'しっとりしたシボ革。長さを調整できるショルダー付き。'],
  ['shoulder', 'スリング ボディバッグ', 6930, 8250, 'black gray', 4.3, 88, '', '体に沿う形で、自転車でも揺れにくい。'],
  ['mug', '粉引き ストーンウェアマグ', 2420, 0, 'white gray beige', 4.7, 310, '', 'ぽってりとした厚みの手仕事の器。電子レンジ可。'],
  ['mug', 'ホーロー マグ 350ml', 1980, 0, 'white navy mustard', 4.4, 122, '', '直火にかけられるホーロー。キャンプにも。'],
  ['mug', '二重構造 ステンレスマグ', 3520, 0, 'black olive white', 4.5, 97, '', '結露しにくく、温かさが長持ちする真空二重構造。'],
  ['mug', 'スタッキング マグ 2個組', 3300, 0, 'terracotta white', 4.1, 28, 'new', '重ねてしまえる、すっきりとした円筒形。'],
  ['cap', '6パネル コットンキャップ', 4180, 0, 'black navy beige olive', 4.5, 176, '', '浅めのかぶり心地。後ろのベルトで調整できる。'],
  ['cap', 'ナイロン ジェットキャップ', 4950, 0, 'black gray', 4.2, 47, '', '撥水ナイロンの 5 パネル。たたんでバッグに。'],
  ['cap', 'コーデュロイ キャップ', 4620, 5280, 'terracotta olive beige', 4.3, 59, '', '秋冬らしい太畝コーデュロイ。'],
  ['socks', 'リブ ソックス 3足セット', 2750, 0, 'white gray black', 4.6, 295, '', '程よい厚みのリブ編み。毎日はける 3 足セット。'],
  ['socks', 'ウール パイル ソックス', 1980, 0, 'mustard terracotta navy', 4.5, 83, '', '足裏パイルでふかふか。冬の部屋ばきにも。'],
  ['socks', 'スニーカー ソックス', 1320, 0, 'white black', 4.0, 117, 'sold', '浅履きで靴から見えにくい。かかとの脱げ止め付き。'],
]

const PRODUCTS: Product[] = RAW.map(([kind, name, price, was, colors, rating, reviews, flag, desc], i) => {
  const id = `p${i + 1}`
  const rnd = mulberry32(hash(name))
  const parent = PARENT_OF[kind]
  const sizes: SizeId[] = parent === 'wear' ? ['S', 'M', 'L', 'XL'] : kind === 'socks' ? ['S', 'M', 'L'] : ['F']
  const stock: Partial<Record<SizeId, number>> = {}
  sizes.forEach((s, si) => {
    const r = rnd()
    stock[s] = flag === 'sold' ? 0 : flag === 'low' ? (si % 2 === 0 ? 1 + Math.floor(r * 2) : 0) : sizes.length === 1 ? 4 + Math.floor(r * 20) : r < 0.14 ? 0 : 1 + Math.floor(r * 14)
  })
  return {
    id,
    kind,
    name,
    price,
    was,
    colors: colors.split(' ') as ColorId[],
    sizes,
    stock,
    rating,
    reviews,
    isNew: flag === 'new',
    pop: reviews * rating + rnd() * 120,
    added: (flag === 'new' ? 100 : 0) + Math.floor(rnd() * 90),
    desc,
  }
})

const totalStock = (p: Product) => p.sizes.reduce((a, s) => a + (p.stock[s] ?? 0), 0)

const PRICE_MAX = 25000
const PRICE_STEP = 500
const BIN = 1000

type Filters = {
  cat: CatId
  price: [number, number]
  colors: ColorId[]
  sizes: SizeId[]
  rating: number
  inStock: boolean
  sale: boolean
  q: string
}
type FacetKey = 'cat' | 'price' | 'colors' | 'sizes' | 'rating' | 'inStock' | 'sale' | 'q'

const DEFAULT_FILTERS: Filters = { cat: 'all', price: [0, PRICE_MAX], colors: [], sizes: [], rating: 0, inStock: false, sale: false, q: '' }

function matches(p: Product, f: Filters, skip?: FacetKey) {
  if (skip !== 'cat' && f.cat !== 'all' && f.cat !== p.kind && f.cat !== PARENT_OF[p.kind]) return false
  if (skip !== 'price' && (p.price < f.price[0] || p.price > f.price[1])) return false
  if (skip !== 'colors' && f.colors.length && !p.colors.some((c) => f.colors.includes(c))) return false
  if (skip !== 'sizes' && f.sizes.length && !p.sizes.some((s) => f.sizes.includes(s))) return false
  if (skip !== 'rating' && p.rating < f.rating) return false
  if (skip !== 'inStock' && f.inStock && totalStock(p) === 0) return false
  if (skip !== 'sale' && f.sale && !p.was) return false
  if (skip !== 'q' && f.q.trim()) {
    const q = f.q.trim().toLowerCase()
    const hay = `${p.name} ${p.desc} ${CAT_LABEL[p.kind]} ${CAT_LABEL[PARENT_OF[p.kind]]} ${p.colors.map((c) => COLORS[c].label).join(' ')}`.toLowerCase()
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
  }
  return true
}

const SORTS: { id: SortId; label: string }[] = [
  { id: 'recommended', label: 'おすすめ順' },
  { id: 'new', label: '新着順' },
  { id: 'price-asc', label: '価格の安い順' },
  { id: 'price-desc', label: '価格の高い順' },
  { id: 'rating', label: '評価の高い順' },
]

function sortProducts(list: Product[], s: SortId) {
  const a = [...list]
  if (s === 'recommended') a.sort((x, y) => y.pop - x.pop)
  if (s === 'new') a.sort((x, y) => y.added - x.added)
  if (s === 'price-asc') a.sort((x, y) => x.price - y.price)
  if (s === 'price-desc') a.sort((x, y) => y.price - x.price)
  if (s === 'rating') a.sort((x, y) => y.rating - x.rating || y.reviews - x.reviews)
  return a
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

/* ───────────── 商品イラスト ───────────── */

function ProductArt({ kind, color, className }: { kind: Kind; color: ColorId; className?: string }) {
  const m = COLORS[color].hex
  const d = COLORS[color].shade
  const s = { stroke: d, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let body: ReactNode = null
  switch (kind) {
    case 'tee':
      body = (
        <>
          <path d="M72 38 L46 48 L22 76 L42 98 L58 86 L58 168 Q100 173 142 168 L142 86 L158 98 L178 76 L154 48 L128 38 Q100 60 72 38Z" fill={m} {...s} />
          <path d="M72 38 Q100 60 128 38 Q100 50 72 38Z" fill={d} />
          <path d="M29 69 L48 90 M171 69 L152 90 M60 160 Q100 165 140 160" fill="none" {...s} strokeWidth={1.3} opacity={0.55} />
          <rect x="108" y="76" width="20" height="22" rx="2" fill="none" {...s} strokeWidth={1.4} opacity={0.6} />
        </>
      )
      break
    case 'shirt':
      body = (
        <>
          <path d="M74 36 L50 44 Q38 52 34 72 L24 150 L44 154 L58 94 L58 170 L142 170 L142 94 L156 154 L176 150 L166 72 Q162 52 150 44 L126 36Z" fill={m} {...s} />
          <path d="M24 150 L44 154 L46 142 L26 138Z M176 150 L156 154 L154 142 L174 138Z" fill={d} opacity={0.8} />
          <path d="M100 52 L100 170" {...s} strokeWidth={1.4} />
          {[74, 96, 118, 140].map((y) => (
            <circle key={y} cx="104" cy={y} r="2.2" fill={d} />
          ))}
          <path d="M74 36 L100 52 L88 66 L70 42Z M126 36 L100 52 L112 66 L130 42Z" fill={m} {...s} />
          <rect x="114" y="82" width="18" height="20" rx="2" fill="none" {...s} strokeWidth={1.4} opacity={0.65} />
        </>
      )
      break
    case 'knit':
      body = (
        <>
          <path d="M76 38 L52 46 Q40 54 36 74 L26 148 L46 152 L60 96 L60 160 L140 160 L140 96 L154 152 L174 148 L164 74 Q160 54 148 46 L124 38 Q100 54 76 38Z" fill={m} {...s} />
          <path d="M76 39 Q100 56 124 39" fill="none" stroke={d} strokeWidth={6} strokeLinecap="round" opacity={0.75} />
          <rect x="59" y="156" width="82" height="14" rx="3" fill={d} opacity={0.85} />
          {Array.from({ length: 13 }, (_, i) => (
            <path key={i} d={`M${64 + i * 6} 158 v10`} stroke={m} strokeWidth={1.2} opacity={0.45} />
          ))}
          <path d="M26 148 L46 152 L48 140 L28 136Z M174 148 L154 152 L152 140 L172 136Z" fill={d} opacity={0.85} />
          <path d="M92 64 l8 9 l-8 9 l8 9 l-8 9 l8 9 l-8 9 l8 9 M108 64 l-8 9 l8 9 l-8 9 l8 9 l-8 9 l8 9 l-8 9" fill="none" stroke={d} strokeWidth={1.6} opacity={0.45} />
        </>
      )
      break
    case 'outer':
      body = (
        <>
          <path d="M68 46 Q66 14 100 12 Q134 14 132 46 Q100 34 68 46Z" fill={d} {...s} />
          <path d="M70 42 L46 52 Q36 60 32 80 L24 158 L44 162 L58 102 L58 174 L142 174 L142 102 L156 162 L176 158 L168 80 Q164 60 154 52 L130 42 Q100 58 70 42Z" fill={m} {...s} />
          <path d="M100 56 L100 174" stroke={d} strokeWidth={3} />
          <rect x="97" y="64" width="6" height="11" rx="2" fill={d} />
          <path d="M64 120 L90 116 L90 125 L64 129Z M136 120 L110 116 L110 125 L136 129Z" fill={d} opacity={0.75} />
          <path d="M91 50 v14 M109 50 v14" stroke={d} strokeWidth={1.6} />
          <path d="M24 158 L44 162 L45 152 L26 149Z M176 158 L156 162 L155 152 L174 149Z" fill={d} opacity={0.7} />
        </>
      )
      break
    case 'tote':
      body = (
        <>
          <path d="M78 74 Q78 28 100 28 Q122 28 122 74" fill="none" stroke={d} strokeWidth={6} strokeLinecap="round" />
          <path d="M70 74 Q72 40 100 40 Q128 40 130 74" fill="none" stroke={d} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
          <path d="M46 72 L154 72 L162 170 L38 170Z" fill={m} {...s} />
          <path d="M47 84 L153 84" {...s} strokeWidth={1.3} opacity={0.5} />
          <rect x="86" y="112" width="28" height="18" rx="2" fill={d} opacity={0.3} />
          <path d="M93 121 h14" stroke={m} strokeWidth={1.6} />
        </>
      )
      break
    case 'backpack':
      body = (
        <>
          <path d="M88 44 Q100 24 112 44" fill="none" stroke={d} strokeWidth={4.5} strokeLinecap="round" />
          <rect x="52" y="42" width="96" height="130" rx="32" fill={m} {...s} />
          <path d="M60 80 Q100 60 140 80" fill="none" {...s} strokeWidth={1.6} />
          <rect x="64" y="104" width="72" height="56" rx="16" fill={d} opacity={0.35} stroke={d} strokeWidth={1.6} />
          <path d="M72 118 h56" {...s} strokeWidth={1.4} />
          <rect x="120" y="113" width="5" height="10" rx="1.5" fill={d} />
          <rect x="132" y="70" width="5" height="10" rx="1.5" fill={d} />
        </>
      )
      break
    case 'shoulder':
      body = (
        <>
          <path d="M56 100 Q100 6 144 100" fill="none" stroke={d} strokeWidth={3.5} strokeLinecap="round" />
          <rect x="48" y="94" width="104" height="72" rx="14" fill={m} {...s} />
          <path d="M48 108 Q48 94 62 94 L138 94 Q152 94 152 108 L152 126 Q100 142 48 126Z" fill={d} opacity={0.32} stroke={d} strokeWidth={1.6} />
          <rect x="93" y="126" width="14" height="9" rx="2" fill="#c9a96a" stroke="#9c7f45" strokeWidth={1} />
        </>
      )
      break
    case 'mug':
      body = (
        <>
          <path d="M44 34 q6 -8 0 -16 M62 38 q6 -8 0 -16" fill="none" stroke="rgba(0,0,0,.14)" strokeWidth={2.5} strokeLinecap="round" transform="translate(42 10)" />
          <path d="M140 88 Q174 88 174 118 Q174 148 140 148" fill="none" stroke={d} strokeWidth={15} strokeLinecap="round" />
          <path d="M140 88 Q174 88 174 118 Q174 148 140 148" fill="none" stroke={m} strokeWidth={9} strokeLinecap="round" />
          <path d="M54 70 L146 70 L142 160 Q100 172 58 160Z" fill={m} {...s} />
          <ellipse cx="100" cy="70" rx="46" ry="9" fill={d} />
          <ellipse cx="100" cy="71" rx="40" ry="6" fill="#5b3a26" opacity={0.85} />
          <path d="M58 140 Q100 150 142 140" fill="none" {...s} strokeWidth={1.2} opacity={0.4} />
        </>
      )
      break
    case 'cap':
      body = (
        <>
          <path d="M60 128 Q30 128 14 146 Q56 156 108 136Z" fill={d} {...s} />
          <path d="M52 132 Q50 64 108 62 Q164 64 164 132 Q108 120 52 132Z" fill={m} {...s} />
          <path d="M108 62 Q94 92 96 126 M108 62 Q132 90 136 124" fill="none" {...s} strokeWidth={1.4} opacity={0.6} />
          <circle cx="108" cy="62" r="4.5" fill={d} />
          <circle cx="84" cy="86" r="1.8" fill={d} />
          <circle cx="146" cy="96" r="1.8" fill={d} />
        </>
      )
      break
    case 'socks':
      body = (
        <>
          <g transform="translate(-22 8)" opacity={0.92}>
            <path d="M74 36 L104 36 L104 112 Q104 124 114 130 L140 146 Q154 156 146 168 Q138 178 124 172 L84 148 Q74 140 74 124Z" fill={d} {...s} />
          </g>
          <path d="M74 36 L104 36 L104 112 Q104 124 114 130 L140 146 Q154 156 146 168 Q138 178 124 172 L84 148 Q74 140 74 124Z" fill={m} {...s} />
          <rect x="74" y="36" width="30" height="20" fill={d} opacity={0.55} />
          {[80, 86, 92, 98].map((x) => (
            <path key={x} d={`M${x} 38 v16`} stroke={m} strokeWidth={1.4} opacity={0.6} />
          ))}
          <path d="M128 150 Q150 154 148 166 Q140 178 124 172 L118 168Z" fill={d} opacity={0.6} />
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <ellipse cx="100" cy="182" rx="62" ry="7" fill="rgba(0,0,0,.07)" />
      {body}
    </svg>
  )
}

/* ───────────── 小物 ───────────── */

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-stone-300" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-500" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

function Swatch({ color, size = 14, ring }: { color: ColorId; size?: number; ring?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${ring ? 'ring-1 ring-black/15 ring-inset' : ''}`}
      style={{ width: size, height: size, background: COLORS[color].hex, boxShadow: color === 'white' ? 'inset 0 0 0 1px rgba(0,0,0,.18)' : undefined }}
    />
  )
}

function Price({ p, big }: { p: Product; big?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
      <span className={`${big ? 'text-xl' : 'text-[14px]'} font-semibold ${p.was ? 'text-[#c2412d]' : 'text-stone-900'}`}>{yen(p.price)}</span>
      {p.was > 0 && (
        <>
          <span className={`${big ? 'text-sm' : 'text-[11px]'} text-stone-400 line-through`}>{yen(p.was)}</span>
          <span className={`${big ? 'text-xs' : 'text-[10px]'} font-semibold text-[#c2412d]`}>{Math.round((1 - p.price / p.was) * 100)}%OFF</span>
        </>
      )}
      {big && <span className="text-[11px] text-stone-500">税込</span>}
    </span>
  )
}

function HeartButton({ on, onToggle, label, className = 'relative' }: { on: boolean; onToggle: () => void; label: string; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={on}
      aria-label={on ? `${label}をお気に入りから削除` : `${label}をお気に入りに追加`}
      className={`grid size-8 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] ${className}`}
    >
      <AnimatePresence>
        {on && !reduce && (
          <motion.span
            key="ring"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#e0525a]"
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <motion.span key={on ? 'on' : 'off'} initial={reduce ? false : { scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }}>
        <Heart className={`size-4 ${on ? 'text-[#e0525a]' : 'text-stone-600'}`} fill={on ? 'currentColor' : 'none'} strokeWidth={2} />
      </motion.span>
    </button>
  )
}

/* ───────────── 価格スライダー ───────────── */

function PriceRange({ value, onChange, hist }: { value: [number, number]; onChange: (v: [number, number]) => void; hist: number[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<0 | 1 | null>(null)
  const [active, setActive] = useState<0 | 1 | null>(null)
  const maxBin = Math.max(1, ...hist)

  const toVal = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.round((ratio * PRICE_MAX) / PRICE_STEP) * PRICE_STEP
  }
  const set = (idx: 0 | 1, v: number) => {
    const [lo, hi] = value
    if (idx === 0) onChange([Math.min(Math.max(0, v), hi - PRICE_STEP), hi])
    else onChange([lo, Math.max(Math.min(PRICE_MAX, v), lo + PRICE_STEP)])
  }
  const onDown = (e: ReactPointerEvent, forced?: 0 | 1) => {
    if (e.button !== 0) return
    const v = toVal(e.clientX)
    const d0 = Math.abs(v - value[0])
    const d1 = Math.abs(v - value[1])
    const idx: 0 | 1 = forced ?? (d0 < d1 ? 0 : d0 > d1 ? 1 : v < value[0] ? 0 : 1)
    drag.current = idx
    setActive(idx)
    trackRef.current?.setPointerCapture(e.pointerId)
    if (forced === undefined) set(idx, v)
    e.preventDefault()
  }
  const onKey = (idx: 0 | 1) => (e: ReactKeyboardEvent) => {
    const cur = value[idx]
    const map: Record<string, number> = {
      ArrowLeft: cur - PRICE_STEP,
      ArrowDown: cur - PRICE_STEP,
      ArrowRight: cur + PRICE_STEP,
      ArrowUp: cur + PRICE_STEP,
      PageDown: cur - 2500,
      PageUp: cur + 2500,
      Home: 0,
      End: PRICE_MAX,
    }
    if (e.key in map) {
      e.preventDefault()
      set(idx, map[e.key])
    }
  }
  const pct = (v: number) => (v / PRICE_MAX) * 100

  return (
    <div className="select-none">
      <div className="flex h-12 items-end gap-[2px] px-[9px]" aria-hidden="true">
        {hist.map((n, i) => {
          const inRange = i * BIN + BIN > value[0] && i * BIN < value[1]
          return (
            <motion.div
              key={i}
              className={`flex-1 rounded-t-[2px] ${inRange ? 'bg-[#245b52]/70' : 'bg-stone-300/70'}`}
              initial={false}
              animate={{ height: n ? `${8 + (n / maxBin) * 92}%` : '3%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )
        })}
      </div>
      <div
        ref={trackRef}
        className="relative mx-[9px] h-5 cursor-pointer touch-none"
        onPointerDown={(e) => onDown(e)}
        onPointerMove={(e) => {
          if (drag.current === null) return
          set(drag.current, toVal(e.clientX))
        }}
        onPointerUp={() => {
          drag.current = null
          setActive(null)
        }}
        onPointerCancel={() => {
          drag.current = null
          setActive(null)
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-200" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#245b52]" style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }} />
        {([0, 1] as const).map((idx) => (
          <div
            key={idx}
            role="slider"
            tabIndex={0}
            aria-label={idx === 0 ? '最低価格' : '最高価格'}
            aria-valuemin={idx === 0 ? 0 : value[0] + PRICE_STEP}
            aria-valuemax={idx === 0 ? value[1] - PRICE_STEP : PRICE_MAX}
            aria-valuenow={value[idx]}
            aria-valuetext={yen(value[idx]) + (idx === 1 && value[1] === PRICE_MAX ? '以上' : '')}
            onKeyDown={onKey(idx)}
            onPointerDown={(e) => {
              e.stopPropagation()
              onDown(e, idx)
            }}
            className={`absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#245b52] bg-white shadow-md transition-[box-shadow,transform] outline-none focus-visible:ring-4 focus-visible:ring-[#245b52]/25 ${active === idx ? 'scale-110 ring-4 ring-[#245b52]/20' : ''}`}
            style={{ left: `${pct(value[idx])}%`, zIndex: idx === 0 && value[0] > PRICE_MAX - 2000 ? 2 : 1 }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <PriceInput label="最低価格" value={value[0]} onCommit={(v) => set(0, v)} />
        <span className="text-stone-400">–</span>
        <PriceInput label="最高価格" value={value[1]} onCommit={(v) => set(1, v)} suffix={value[1] === PRICE_MAX ? '+' : ''} />
      </div>
    </div>
  )
}

function PriceInput({ label, value, onCommit, suffix = '' }: { label: string; value: number; onCommit: (v: number) => void; suffix?: string }) {
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    const n = Number(text.replace(/[^\d]/g, ''))
    if (text.trim() !== '' && Number.isFinite(n)) onCommit(Math.round(n / PRICE_STEP) * PRICE_STEP)
    setText(null)
  }
  return (
    <label className="flex min-w-0 flex-1 items-center rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[12px] focus-within:border-[#245b52] focus-within:ring-2 focus-within:ring-[#245b52]/15">
      <span className="text-stone-400">¥</span>
      <input
        aria-label={label}
        inputMode="numeric"
        className="w-full min-w-0 bg-transparent pl-1 tabular-nums outline-none"
        value={text ?? value.toLocaleString('ja-JP') + suffix}
        onFocus={() => setText(String(value))}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
    </label>
  )
}

/* ───────────── フィルターパネル ───────────── */

type Facets = {
  cat: Record<string, number>
  colors: Record<ColorId, number>
  sizes: Record<SizeId, number>
  rating: Record<number, number>
  inStock: number
  sale: number
  hist: number[]
}

function Section({ title, children, active, onReset, defaultOpen = true }: { title: string; children: ReactNode; active?: boolean; onReset?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = useReducedMotion()
  const id = useId()
  return (
    <section className="border-b border-stone-200/80 py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1.5 rounded text-left text-[12.5px] font-semibold tracking-wide text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
        >
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
            <ChevronRight className="size-3.5 text-stone-400" />
          </motion.span>
          {title}
          {active && <span className="size-1.5 rounded-full bg-[#245b52]" aria-label="適用中" />}
        </button>
        {active && onReset && (
          <button type="button" onClick={onReset} className="rounded text-[11px] text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline focus-visible:outline-2 focus-visible:outline-[#245b52]">
            リセット
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.22, ease: [0.3, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-auto text-[11px] text-stone-400 tabular-nums">{n}</span>
}

function FilterPanel({ f, update, facets }: { f: Filters; update: (fn: (f: Filters) => Filters) => void; facets: Facets }) {
  const [expanded, setExpanded] = useState<Record<ParentId, boolean>>({ wear: true, bag: false, goods: false })
  const catBtn = (id: CatId, label: string, depth: number, n: number) => {
    const on = f.cat === id
    return (
      <button
        type="button"
        aria-current={on ? 'true' : undefined}
        disabled={n === 0 && !on}
        onClick={() => update((x) => ({ ...x, cat: id }))}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-[#245b52] disabled:opacity-35 ${on ? 'bg-[#245b52]/10 font-semibold text-[#245b52]' : 'text-stone-700 hover:bg-stone-100'}`}
        style={{ paddingLeft: 8 + depth * 4 }}
      >
        <span className="truncate">{label}</span>
        <Count n={n} />
      </button>
    )
  }
  return (
    <div className="px-4 pb-4">
      <Section title="カテゴリ" active={f.cat !== 'all'} onReset={() => update((x) => ({ ...x, cat: 'all' }))}>
        <ul className="space-y-0.5 text-[12.5px]">
          <li className="flex">{catBtn('all', 'すべて', 0, facets.cat.all)}</li>
          {TREE.map((t) => (
            <li key={t.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={`${t.label}を${expanded[t.id] ? '閉じる' : '開く'}`}
                  aria-expanded={expanded[t.id]}
                  onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}
                  className="grid size-6 shrink-0 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                >
                  <ChevronRight className={`size-3.5 transition-transform ${expanded[t.id] ? 'rotate-90' : ''}`} />
                </button>
                {catBtn(t.id, t.label, 0, facets.cat[t.id] ?? 0)}
              </div>
              <AnimatePresence initial={false}>
                {expanded[t.id] && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-3 overflow-hidden border-l border-stone-200 pl-2"
                  >
                    {t.children.map((c) => (
                      <li key={c.id} className="flex py-px">
                        {catBtn(c.id, c.label, 1, facets.cat[c.id] ?? 0)}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="価格帯" active={f.price[0] > 0 || f.price[1] < PRICE_MAX} onReset={() => update((x) => ({ ...x, price: [0, PRICE_MAX] }))}>
        <PriceRange value={f.price} onChange={(price) => update((x) => ({ ...x, price }))} hist={facets.hist} />
      </Section>

      <Section title="カラー" active={f.colors.length > 0} onReset={() => update((x) => ({ ...x, colors: [] }))}>
        <div className="grid grid-cols-4 gap-x-1 gap-y-2">
          {COLOR_ORDER.map((c) => {
            const on = f.colors.includes(c)
            const n = facets.colors[c]
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                aria-label={`${COLORS[c].label}(${n}件)`}
                title={`${COLORS[c].label}(${n})`}
                disabled={n === 0 && !on}
                onClick={() => update((x) => ({ ...x, colors: on ? x.colors.filter((y) => y !== c) : [...x.colors, c] }))}
                className="group flex flex-col items-center gap-1 rounded-md py-0.5 focus-visible:outline-2 focus-visible:outline-[#245b52] disabled:opacity-30"
              >
                <span className={`relative grid size-7 place-items-center rounded-full transition-shadow ${on ? 'ring-2 ring-[#245b52] ring-offset-2' : 'group-hover:ring-2 group-hover:ring-stone-300 group-hover:ring-offset-1'}`}>
                  <Swatch color={c} size={28} />
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute">
                      <Check className={`size-3.5 ${c === 'white' || c === 'beige' || c === 'mustard' ? 'text-stone-800' : 'text-white'}`} strokeWidth={3} />
                    </motion.span>
                  )}
                </span>
                <span className="text-[10px] leading-none text-stone-500 tabular-nums">{n}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="サイズ" active={f.sizes.length > 0} onReset={() => update((x) => ({ ...x, sizes: [] }))}>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_ORDER.map((s) => {
            const on = f.sizes.includes(s)
            const n = facets.sizes[s]
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                disabled={n === 0 && !on}
                onClick={() => update((x) => ({ ...x, sizes: on ? x.sizes.filter((y) => y !== s) : [...x.sizes, s] }))}
                className={`flex min-w-11 items-baseline justify-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52] disabled:opacity-35 ${on ? 'border-[#245b52] bg-[#245b52] text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}
              >
                {SIZE_NOTE[s] ?? s}
                <span className={`text-[10px] tabular-nums ${on ? 'text-white/70' : 'text-stone-400'}`}>{n}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="評価" active={f.rating > 0} onReset={() => update((x) => ({ ...x, rating: 0 }))}>
        <div role="radiogroup" aria-label="評価" className="space-y-0.5">
          {[0, 4.5, 4, 3].map((r) => {
            const on = f.rating === r
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update((x) => ({ ...x, rating: r }))}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-[#245b52] ${on ? 'bg-[#245b52]/10 text-[#245b52]' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                <span className={`grid size-3.5 place-items-center rounded-full border ${on ? 'border-[#245b52]' : 'border-stone-300'}`}>{on && <span className="size-1.5 rounded-full bg-[#245b52]" />}</span>
                {r === 0 ? (
                  'すべて'
                ) : (
                  <>
                    <Stars value={r} />
                    <span>{r} 以上</span>
                  </>
                )}
                <Count n={facets.rating[r] ?? 0} />
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="在庫・セール" active={f.inStock || f.sale}>
        <div className="space-y-2">
          <Toggle label="在庫ありのみ" checked={f.inStock} n={facets.inStock} onChange={(v) => update((x) => ({ ...x, inStock: v }))} />
          <Toggle label="セール商品のみ" checked={f.sale} n={facets.sale} onChange={(v) => update((x) => ({ ...x, sale: v }))} />
        </div>
      </Section>
    </div>
  )
}

function Toggle({ label, checked, onChange, n }: { label: string; checked: boolean; onChange: (v: boolean) => void; n: number }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left text-[12.5px] text-stone-700 focus-visible:outline-2 focus-visible:outline-[#245b52]"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#245b52]' : 'bg-stone-300'}`}>
        <motion.span className="absolute top-0.5 size-4 rounded-full bg-white shadow" animate={{ left: checked ? 18 : 2 }} transition={{ type: 'spring', stiffness: 600, damping: 34 }} />
      </span>
      {label}
      <Count n={n} />
    </button>
  )
}

/* ───────────── 商品カード ───────────── */

function ProductCard({
  p,
  prefer,
  view,
  liked,
  onLike,
  onQuick,
  index,
}: {
  p: Product
  prefer: ColorId[]
  view: 'grid' | 'list'
  liked: boolean
  onLike: () => void
  onQuick: (color: ColorId, el: HTMLElement) => void
  index: number
}) {
  const reduce = useReducedMotion()
  const firstMatch = p.colors.find((c) => prefer.includes(c)) ?? p.colors[0]
  const [picked, setPicked] = useState<ColorId | null>(null)
  const color = picked && p.colors.includes(picked) ? picked : firstMatch
  const stock = totalStock(p)
  const low = stock > 0 && stock <= 3
  const soldOut = stock === 0
  const list = view === 'list'
  const t: Transition = reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }

  const badges = (
    <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
      {p.isNew && <span className="rounded bg-stone-900 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-white">NEW</span>}
      {p.was > 0 && <span className="rounded bg-[#c2412d] px-1.5 py-0.5 text-[9.5px] font-bold text-white">SALE</span>}
      {low && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-800">残りわずか</span>}
    </div>
  )

  return (
    <motion.li
      layout={reduce ? false : 'position'}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: reduce ? { duration: 0.15 } : { ...t, delay: Math.min(index, 8) * 0.025 } }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.92, transition: { duration: 0.16 } }}
      transition={t}
      className={`group relative ${list ? 'flex gap-3 rounded-2xl border border-stone-200/80 bg-white p-2.5 @lg:gap-4' : 'flex flex-col'}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden ${list ? 'size-28 rounded-xl @lg:size-32' : 'aspect-[4/5] w-full rounded-2xl'}`}
        style={{ background: COLORS[color].bg }}
      >
        <button
          type="button"
          onClick={(e) => onQuick(color, e.currentTarget)}
          aria-label={`${p.name}(${COLORS[color].label})のクイックビューを開く`}
          className="absolute inset-0 grid place-items-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#245b52]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={color}
              className={`${list ? 'w-[86%]' : 'w-[78%]'} ${soldOut ? 'opacity-50 grayscale-[.6]' : ''}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              <ProductArt kind={p.kind} color={color} className="w-full transition-transform duration-500 group-hover:scale-[1.04]" />
            </motion.div>
          </AnimatePresence>
        </button>
        {badges}
        {soldOut && <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-stone-900/70 py-1 text-center text-[10.5px] font-semibold tracking-wider text-white">入荷待ち</span>}
        {!list && (
          <>
            <HeartButton on={liked} onToggle={onLike} label={p.name} className="absolute top-2 right-2" />
            {!soldOut && (
              <span className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-2 items-center justify-center gap-1.5 rounded-full bg-white/95 py-1.5 text-[11.5px] font-semibold text-stone-800 opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 @lg:flex">
                <Eye className="size-3.5" />
                クイックビュー
              </span>
            )}
          </>
        )}
      </div>

      <div className={`min-w-0 ${list ? 'flex flex-1 flex-col py-0.5' : 'px-0.5 pt-2'}`}>
        <div className="flex items-center gap-1 text-[10.5px] text-stone-500">
          <span className="truncate">{CAT_LABEL[p.kind]}</span>
        </div>
        <h3 className={`mt-0.5 leading-snug font-medium text-stone-900 ${list ? 'text-[14px]' : 'line-clamp-2 text-[13px]'}`}>{p.name}</h3>
        {list && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-stone-500">{p.desc}</p>}
        <div className="mt-1 flex items-center gap-1 text-[10.5px] text-stone-500">
          <Stars value={p.rating} size={11} />
          <span className="tabular-nums">
            {p.rating.toFixed(1)}
            <span className="text-stone-400">({p.reviews})</span>
          </span>
        </div>
        <div className={`flex items-center justify-between gap-2 ${list ? 'mt-auto pt-2' : 'mt-1'}`}>
          <Price p={p} />
          {list && (
            <div className="flex items-center gap-1.5">
              <HeartButton on={liked} onToggle={onLike} label={p.name} />
              <button
                type="button"
                onClick={(e) => onQuick(color, e.currentTarget)}
                className="hidden items-center gap-1 rounded-full bg-stone-900 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] @lg:flex"
              >
                <Eye className="size-3.5" />
                詳細
              </button>
            </div>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1" role="radiogroup" aria-label={`${p.name}のカラー`}>
          {p.colors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={COLORS[c].label}
              onClick={() => setPicked(c)}
              className={`grid size-[18px] place-items-center rounded-full transition-shadow focus-visible:outline-2 focus-visible:outline-[#245b52] ${c === color ? 'ring-[1.5px] ring-stone-700' : 'hover:ring-1 hover:ring-stone-300'}`}
            >
              <Swatch color={c} size={12} />
            </button>
          ))}
          {list && (
            <span className="ml-2 text-[11px] text-stone-400">
              {p.sizes.map((s) => (
                <span key={s} className={`mr-1 ${(p.stock[s] ?? 0) === 0 ? 'line-through opacity-60' : ''}`}>
                  {SIZE_NOTE[s] ?? s}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  )
}

function SkeletonCard({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list')
    return (
      <li className="flex gap-3 rounded-2xl border border-stone-200/80 bg-white p-2.5" aria-hidden="true">
        <div className="size-28 shrink-0 animate-pulse rounded-xl bg-stone-200/80 @lg:size-32" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <div className="h-2.5 w-16 animate-pulse rounded bg-stone-200" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-stone-200" />
          <div className="h-2.5 w-full animate-pulse rounded bg-stone-100" />
          <div className="mt-auto h-3.5 w-20 animate-pulse rounded bg-stone-200" />
        </div>
      </li>
    )
  return (
    <li className="flex flex-col" aria-hidden="true">
      <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-stone-200/80" />
      <div className="mt-2.5 h-2.5 w-14 animate-pulse rounded bg-stone-200" />
      <div className="mt-1.5 h-3.5 w-4/5 animate-pulse rounded bg-stone-200" />
      <div className="mt-1.5 h-3.5 w-16 animate-pulse rounded bg-stone-200" />
    </li>
  )
}

/* ───────────── クイックビュー ───────────── */

function QuickView({
  p,
  initialColor,
  liked,
  onLike,
  onClose,
  onAdd,
}: {
  p: Product
  initialColor: ColorId
  liked: boolean
  onLike: () => void
  onClose: () => void
  onAdd: (qty: number, color: ColorId, size: SizeId) => void
}) {
  const reduce = useReducedMotion()
  const [color, setColor] = useState<ColorId>(initialColor)
  const [size, setSize] = useState<SizeId | null>(p.sizes.length === 1 ? p.sizes[0] : null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [notify, setNotify] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const left = size ? (p.stock[size] ?? 0) : null
  const maxQty = Math.max(1, Math.min(5, left ?? 5))

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1600)
    return () => clearTimeout(t)
  }, [added])

  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const els = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')]
    if (!els.length) return
    const first = els[0]
    const last = els[els.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <motion.div className="absolute inset-0 z-50 grid place-items-center p-3 @md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trap}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex max-h-full w-full max-w-[820px] flex-col overflow-hidden rounded-3xl bg-[#fbfaf7] shadow-2xl @2xl:flex-row"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-black/5 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
        >
          <X className="size-4" />
        </button>
        <div className="relative flex shrink-0 flex-col @2xl:w-[46%]" style={{ background: COLORS[color].bg, transition: 'background-color .3s' }}>
          <div className="relative grid h-44 place-items-center @md:h-56 @2xl:h-auto @2xl:flex-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={color}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05, rotate: 3 }}
                transition={{ duration: 0.3, ease: [0.3, 0.7, 0.2, 1] }}
                className="h-40 w-40 @md:h-52 @md:w-52 @2xl:h-64 @2xl:w-64"
              >
                <ProductArt kind={p.kind} color={color} className="h-full w-full" />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="hidden gap-2 p-3 @2xl:flex">
            {p.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`${COLORS[c].label}の画像`}
                className={`grid size-14 place-items-center rounded-xl bg-white/70 transition-shadow focus-visible:outline-2 focus-visible:outline-[#245b52] ${c === color ? 'ring-2 ring-stone-800' : 'ring-1 ring-black/5 hover:ring-stone-400'}`}
              >
                <ProductArt kind={p.kind} color={c} className="size-11" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 @2xl:p-6">
          <p className="text-[11px] tracking-wide text-stone-500">
            {CAT_LABEL[PARENT_OF[p.kind]]} / {CAT_LABEL[p.kind]}
          </p>
          <h2 id={titleId} className="mt-1 pr-8 text-[18px] leading-snug font-semibold text-stone-900">
            {p.name}
          </h2>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-stone-500">
            <Stars value={p.rating} size={13} />
            <span className="tabular-nums">
              {p.rating.toFixed(1)}・レビュー {p.reviews}件
            </span>
          </div>
          <div className="mt-3">
            <Price p={p} big />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600">{p.desc}</p>

          <div className="mt-4">
            <p className="text-[12px] font-semibold text-stone-800">
              カラー:<span className="font-normal text-stone-600">{COLORS[color].label}</span>
            </p>
            <div role="radiogroup" aria-label="カラー" className="mt-2 flex gap-2">
              {p.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === color}
                  aria-label={COLORS[c].label}
                  onClick={() => setColor(c)}
                  className={`grid size-8 place-items-center rounded-full transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] ${c === color ? 'ring-2 ring-stone-800 ring-offset-2' : 'hover:ring-2 hover:ring-stone-300 hover:ring-offset-1'}`}
                >
                  <Swatch color={c} size={28} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] font-semibold text-stone-800">サイズ</p>
              {p.sizes.length > 1 && <span className="text-[11px] text-stone-400">サイズガイド</span>}
            </div>
            <div role="radiogroup" aria-label="サイズ" className="mt-2 flex flex-wrap gap-1.5">
              {p.sizes.map((s) => {
                const n = p.stock[s] ?? 0
                const on = size === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${SIZE_NOTE[s] ?? s}${n === 0 ? '(在庫切れ)' : n <= 2 ? `(残り${n}点)` : ''}`}
                    onClick={() => {
                      setSize(s)
                      setQty(1)
                      setNotify(false)
                    }}
                    className={`relative min-w-12 overflow-hidden rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52] ${on ? 'border-stone-900 bg-stone-900 text-white' : n === 0 ? 'border-stone-200 bg-stone-50 text-stone-400' : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'}`}
                  >
                    {SIZE_NOTE[s] ?? s}
                    {n === 0 && <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),currentColor,transparent_calc(50%+0.5px))] opacity-50" />}
                    {n > 0 && n <= 2 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 h-5 text-[11.5px]" aria-live="polite">
              {left === null ? (
                <span className="text-stone-400">サイズを選択してください</span>
              ) : left === 0 ? (
                <span className="text-stone-500">このサイズは在庫切れです</span>
              ) : left <= 2 ? (
                <span className="font-medium text-amber-700">残り{left}点 — お早めに</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#245b52]">
                  <Check className="size-3.5" /> 在庫あり・最短翌日お届け
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {left === 0 ? (
              <button
                type="button"
                onClick={() => setNotify(true)}
                disabled={notify}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-stone-800 text-[13px] font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] disabled:border-[#245b52] disabled:text-[#245b52]"
              >
                {notify ? (
                  <>
                    <Check className="size-4" /> 入荷したらお知らせします
                  </>
                ) : (
                  '再入荷のお知らせを受け取る'
                )}
              </button>
            ) : (
              <>
                <div className="flex h-11 items-center rounded-full border border-stone-300 bg-white">
                  <button type="button" aria-label="数量を減らす" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className="grid size-10 place-items-center rounded-full text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52] disabled:opacity-30">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-5 text-center text-[13px] font-semibold tabular-nums" aria-live="polite" aria-label={`数量 ${qty}`}>
                    <NumberFlow value={qty} />
                  </span>
                  <button type="button" aria-label="数量を増やす" disabled={qty >= maxQty} onClick={() => setQty((q) => q + 1)} className="grid size-10 place-items-center rounded-full text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52] disabled:opacity-30">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <motion.button
                  type="button"
                  disabled={!size}
                  whileTap={reduce || !size ? undefined : { scale: 0.97 }}
                  onClick={() => {
                    if (!size) return
                    onAdd(qty, color, size)
                    setAdded(true)
                  }}
                  className={`relative flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full text-[13px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] disabled:bg-stone-300 ${added ? 'bg-[#245b52]' : 'bg-stone-900 hover:bg-stone-700'}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={added ? 'ok' : size ? 'add' : 'pick'}
                      className="flex items-center gap-2"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                      transition={{ duration: 0.16 }}
                    >
                      {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
                      {added ? 'カートに追加しました' : size ? `カートに追加 · ${yen(p.price * qty)}` : 'サイズを選択'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </>
            )}
            <HeartButton on={liked} onToggle={onLike} label={p.name} className="relative size-11 shrink-0" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-500">
            <Truck className="size-3.5" /> ¥5,000 以上で送料無料・30 日以内なら返品無料
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ───────────── 並び替えメニュー ───────────── */

function SortMenu({ value, onChange }: { value: SortId; onChange: (s: SortId) => void }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const reduce = useReducedMotion()
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const cur = SORTS.find((s) => s.id === value)!

  useEffect(() => {
    if (open) {
      setHi(SORTS.findIndex((s) => s.id === value))
      listRef.current?.focus({ preventScroll: true })
    }
  }, [open, value])

  const choose = (i: number) => {
    onChange(SORTS[i].id)
    setOpen(false)
    btnRef.current?.focus({ preventScroll: true })
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="flex h-9 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-[12px] text-stone-700 transition-colors hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52]"
      >
        <span className="hidden text-stone-400 @sm:inline">並び替え:</span>
        <span className="font-medium text-stone-900">{cur.label}</span>
        <ChevronDown className={`size-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={id}
            role="listbox"
            tabIndex={-1}
            aria-label="並び替え"
            aria-activedescendant={`${id}-${hi}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHi((h) => (h + 1) % SORTS.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHi((h) => (h - 1 + SORTS.length) % SORTS.length)
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                choose(hi)
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                setOpen(false)
                btnRef.current?.focus({ preventScroll: true })
              } else if (e.key === 'Tab') setOpen(false)
            }}
            className="absolute top-full right-0 z-30 mt-1.5 w-44 origin-top-right rounded-xl border border-stone-200 bg-white p-1 shadow-xl outline-none"
          >
            {SORTS.map((s, i) => (
              <li
                key={s.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={s.id === value}
                onPointerEnter={() => setHi(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] ${i === hi ? 'bg-stone-100' : ''} ${s.id === value ? 'font-semibold text-[#245b52]' : 'text-stone-700'}`}
              >
                {s.label}
                {s.id === value && <Check className="size-3.5" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── 空状態 ───────────── */

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-36" aria-hidden="true">
      <ellipse cx="80" cy="108" rx="54" ry="6" fill="#e7e2d8" />
      <path d="M46 46 L114 46 L120 104 L40 104Z" fill="#f1ece2" stroke="#b9ae9a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 46 Q62 24 80 24 Q98 24 98 46" fill="none" stroke="#b9ae9a" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 74 q4 -4 8 0 M86 74 q4 -4 8 0" fill="none" stroke="#9c917e" strokeWidth="2" strokeLinecap="round" />
      <path d="M72 88 q8 -5 16 0" fill="none" stroke="#9c917e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="122" cy="40" r="15" fill="#fbfaf7" stroke="#245b52" strokeWidth="3" />
      <path d="M133 51 L145 63" stroke="#245b52" strokeWidth="5" strokeLinecap="round" />
      <path d="M117 36 l10 8 M127 36 l-10 8" stroke="#245b52" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  )
}

/* ───────────── 本体 ───────────── */

type Chip = { key: string; label: ReactNode; text: string; remove: (f: Filters) => Filters }

function chipsOf(f: Filters): Chip[] {
  const c: Chip[] = []
  if (f.q.trim()) c.push({ key: 'q', label: `「${f.q.trim()}」`, text: `「${f.q.trim()}」`, remove: (x) => ({ ...x, q: '' }) })
  if (f.cat !== 'all') c.push({ key: 'cat', label: CAT_LABEL[f.cat], text: CAT_LABEL[f.cat], remove: (x) => ({ ...x, cat: 'all' }) })
  if (f.price[0] > 0 || f.price[1] < PRICE_MAX) {
    const t = `${yen(f.price[0])}〜${f.price[1] < PRICE_MAX ? yen(f.price[1]) : ''}`
    c.push({ key: 'price', label: t, text: t, remove: (x) => ({ ...x, price: [0, PRICE_MAX] }) })
  }
  f.colors.forEach((col) =>
    c.push({
      key: `c-${col}`,
      label: (
        <span className="inline-flex items-center gap-1">
          <Swatch color={col} size={10} />
          {COLORS[col].label}
        </span>
      ),
      text: COLORS[col].label,
      remove: (x) => ({ ...x, colors: x.colors.filter((y) => y !== col) }),
    }),
  )
  f.sizes.forEach((s) => c.push({ key: `s-${s}`, label: `サイズ ${SIZE_NOTE[s] ?? s}`, text: `サイズ ${SIZE_NOTE[s] ?? s}`, remove: (x) => ({ ...x, sizes: x.sizes.filter((y) => y !== s) }) }))
  if (f.rating) c.push({ key: 'rating', label: `★${f.rating} 以上`, text: `★${f.rating} 以上`, remove: (x) => ({ ...x, rating: 0 }) })
  if (f.inStock) c.push({ key: 'stock', label: '在庫あり', text: '在庫あり', remove: (x) => ({ ...x, inStock: false }) })
  if (f.sale) c.push({ key: 'sale', label: 'セール', text: 'セール', remove: (x) => ({ ...x, sale: false }) })
  return c
}

const PAGE = 12
const MORE = 8

export function ProductListing() {
  const reduce = useReducedMotion()
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortId>('recommended')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [limit, setLimit] = useState(PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [quick, setQuick] = useState<{ id: string; color: ColorId } | null>(null)
  const [liked, setLiked] = useState<Set<string>>(() => new Set(['p10', 'p18']))
  const [cart, setCart] = useState(1)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const quickOpener = useRef<HTMLElement | null>(null)
  const drawerOpener = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const update = useCallback((fn: (f: Filters) => Filters) => {
    setF(fn)
    setLimit(PAGE)
    setLoadingMore(false)
    clearTimeout(loadTimer.current)
  }, [])
  useEffect(() => () => clearTimeout(loadTimer.current), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const results = useMemo(() => sortProducts(PRODUCTS.filter((p) => matches(p, f)), sort), [f, sort])
  const facets = useMemo<Facets>(() => {
    const base = (skip: FacetKey) => PRODUCTS.filter((p) => matches(p, f, skip))
    const cat: Record<string, number> = {}
    const cb = base('cat')
    cat.all = cb.length
    cb.forEach((p) => {
      cat[p.kind] = (cat[p.kind] ?? 0) + 1
      cat[PARENT_OF[p.kind]] = (cat[PARENT_OF[p.kind]] ?? 0) + 1
    })
    const colors = Object.fromEntries(COLOR_ORDER.map((c) => [c, 0])) as Record<ColorId, number>
    base('colors').forEach((p) => p.colors.forEach((c) => colors[c]++))
    const sizes = Object.fromEntries(SIZE_ORDER.map((s) => [s, 0])) as Record<SizeId, number>
    base('sizes').forEach((p) => p.sizes.forEach((s) => sizes[s]++))
    const rb = base('rating')
    const rating: Record<number, number> = { 0: rb.length }
    ;[4.5, 4, 3].forEach((r) => (rating[r] = rb.filter((p) => p.rating >= r).length))
    const hist = Array.from({ length: PRICE_MAX / BIN }, () => 0)
    base('price').forEach((p) => hist[Math.min(hist.length - 1, Math.floor(p.price / BIN))]++)
    return {
      cat,
      colors,
      sizes,
      rating,
      inStock: base('inStock').filter((p) => totalStock(p) > 0).length,
      sale: base('sale').filter((p) => p.was > 0).length,
      hist,
    }
  }, [f])

  const chips = chipsOf(f)
  const shown = results.slice(0, limit)
  const remaining = results.length - shown.length
  const suggestions = results.length
    ? []
    : chips
        .map((c) => ({ c, n: PRODUCTS.filter((p) => matches(p, c.remove(f))).length }))
        .filter((s) => s.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
  const quickProduct = quick ? PRODUCTS.find((p) => p.id === quick.id) : undefined

  const toggleLike = (p: Product) => {
    const had = liked.has(p.id)
    setLiked((s) => {
      const n = new Set(s)
      if (had) n.delete(p.id)
      else n.add(p.id)
      return n
    })
    setToast({ id: Date.now(), text: had ? 'お気に入りから削除しました' : `「${p.name}」をお気に入りに追加しました` })
  }

  const loadMore = () => {
    if (loadingMore) return
    setLoadingMore(true)
    loadTimer.current = setTimeout(() => {
      setLimit((l) => l + MORE)
      setLoadingMore(false)
    }, 900)
  }

  const closeQuick = () => {
    setQuick(null)
    const el = quickOpener.current
    requestAnimationFrame(() => el?.isConnected && el.focus({ preventScroll: true }))
  }
  const closeDrawer = () => {
    setDrawer(false)
    requestAnimationFrame(() => drawerOpener.current?.focus({ preventScroll: true }))
  }

  const onRootKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (quick) {
      e.preventDefault()
      closeQuick()
    } else if (drawer) {
      e.preventDefault()
      closeDrawer()
    }
  }

  const title = f.q.trim() ? `「${f.q.trim()}」の検索結果` : CAT_LABEL[f.cat]
  const pageT: Transition = reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 36 }

  return (
    <div className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#f6f3ee] font-sans text-stone-900" onKeyDown={onRootKey}>
      {/* ヘッダー */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200/80 bg-[#fbfaf7] px-4 @3xl:px-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="#245b52" />
            <path d="M16 6 C20 11 21 14 21 17 a5 5 0 0 1 -10 0 C11 14 12 11 16 6Z" fill="#f3c86b" />
            <path d="M16 13 C18 15.5 18.5 17 18.5 18.2 a2.5 2.5 0 0 1 -5 0 C13.5 17 14 15.5 16 13Z" fill="#fbfaf7" />
            <rect x="10" y="24" width="12" height="2" rx="1" fill="#f3c86b" opacity=".7" />
          </svg>
          <div className="hidden leading-none @md:block">
            <p className="text-[14px] font-bold tracking-[0.18em]">TOMOSHI</p>
            <p className="mt-0.5 text-[9px] tracking-[0.2em] text-stone-500">ともし 生活道具店</p>
          </div>
        </div>
        <label className="relative ml-auto flex h-9 max-w-[380px] min-w-0 flex-1 items-center rounded-full border border-stone-200 bg-white pr-2 pl-3 focus-within:border-[#245b52] focus-within:ring-2 focus-within:ring-[#245b52]/15 @3xl:ml-6">
          <Search className="size-4 shrink-0 text-stone-400" />
          <input
            value={f.q}
            onChange={(e) => update((x) => ({ ...x, q: e.target.value }))}
            placeholder="商品名・素材で検索"
            aria-label="商品を検索"
            className="w-full min-w-0 bg-transparent px-2 text-[12.5px] outline-none placeholder:text-stone-400"
          />
          {f.q && (
            <button type="button" aria-label="検索語を消去" onClick={() => update((x) => ({ ...x, q: '' }))} className="grid size-6 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <div className="flex items-center gap-1 @3xl:ml-auto">
          <HeaderIcon label={`お気に入り ${liked.size}件`} count={liked.size}>
            <Heart className="size-[18px]" />
          </HeaderIcon>
          <HeaderIcon label={`カート ${cart}点`} count={cart}>
            <ShoppingBag className="size-[18px]" />
          </HeaderIcon>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* サイドバー(広いとき) */}
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-stone-200/80 bg-[#fbfaf7] @3xl:flex" aria-label="絞り込み">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <h2 className="flex items-center gap-1.5 text-[13px] font-bold">
              <SlidersHorizontal className="size-3.5" /> 絞り込み
            </h2>
            {chips.length > 0 && (
              <button type="button" onClick={() => update(() => DEFAULT_FILTERS)} className="flex items-center gap-1 rounded text-[11px] text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52]">
                <RotateCcw className="size-3" />
                すべてクリア
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            <FilterPanel f={f} update={update} facets={facets} />
          </div>
        </aside>

        {/* 一覧 */}
        <motion.main ref={scrollRef} layoutScroll className="relative min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <div className="px-4 pt-3.5 @3xl:px-6">
            <nav aria-label="パンくず" className="flex items-center gap-1 text-[11px] text-stone-500">
              <span>ホーム</span>
              <ChevronRight className="size-3" />
              {f.cat !== 'all' && f.cat !== 'wear' && f.cat !== 'bag' && f.cat !== 'goods' && (
                <>
                  <button type="button" className="hover:text-stone-900 hover:underline" onClick={() => update((x) => ({ ...x, cat: PARENT_OF[x.cat as Kind] }))}>
                    {CAT_LABEL[PARENT_OF[f.cat as Kind]]}
                  </button>
                  <ChevronRight className="size-3" />
                </>
              )}
              <span className="text-stone-800">{CAT_LABEL[f.cat]}</span>
            </nav>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h1 className="min-w-0 truncate text-[19px] font-bold tracking-tight @3xl:text-[22px]">{title}</h1>
              <p className="shrink-0 pb-0.5 text-[12px] text-stone-500 @3xl:hidden" aria-live="polite">
                <span className="text-[15px] font-semibold text-stone-900 tabular-nums">
                  <NumberFlow value={results.length} />
                </span>
                件
              </p>
            </div>
          </div>

          {/* ツールバー */}
          <div className="sticky top-0 z-20 mt-2 border-b border-stone-200/70 bg-[#f6f3ee]/90 px-4 py-2 backdrop-blur-md @3xl:px-6">
            <div className="flex items-center gap-2">
              <button
                ref={drawerOpener}
                type="button"
                onClick={() => setDrawer(true)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-stone-900 px-3.5 text-[12px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] @3xl:hidden"
              >
                <SlidersHorizontal className="size-3.5" />
                絞り込み
                {chips.length > 0 && <span className="grid size-[18px] place-items-center rounded-full bg-white text-[10px] text-stone-900 tabular-nums">{chips.length}</span>}
              </button>
              <p className="hidden items-baseline gap-0.5 text-[12px] text-stone-500 @3xl:flex" aria-live="polite">
                <span className="text-[15px] font-semibold text-stone-900 tabular-nums">
                  <NumberFlow value={results.length} />
                </span>
                件の商品
              </p>
              <div className="ml-auto flex items-center gap-2">
                <SortMenu
                  value={sort}
                  onChange={(s) => {
                    setSort(s)
                    scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
                  }}
                />
                <div role="radiogroup" aria-label="表示形式" className="relative flex h-9 items-center rounded-full border border-stone-200 bg-white p-0.5">
                  {(
                    [
                      ['grid', LayoutGrid, 'グリッド表示'],
                      ['list', List, 'リスト表示'],
                    ] as const
                  ).map(([v, Icon, label]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={view === v}
                      aria-label={label}
                      onClick={() => setView(v)}
                      className={`relative grid h-full w-9 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[#245b52] ${view === v ? 'text-white' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      {view === v && <motion.span layoutId="pl-view-pill" className="absolute inset-0 rounded-full bg-stone-900" transition={pageT} />}
                      <Icon className="relative size-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {chips.length > 0 && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="flex flex-wrap items-center gap-1.5 pt-2" aria-label="適用中の条件">
                    <AnimatePresence initial={false} mode="popLayout">
                      {chips.map((c) => (
                        <motion.li
                          key={c.key}
                          layout={!reduce}
                          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.16 }}
                        >
                          <button
                            type="button"
                            onClick={() => update(c.remove)}
                            aria-label={`条件「${c.text}」を外す`}
                            className="flex h-7 items-center gap-1 rounded-full border border-[#245b52]/25 bg-[#245b52]/8 pr-1.5 pl-2.5 text-[11.5px] font-medium text-[#1d4a42] transition-colors hover:bg-[#245b52]/15 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                          >
                            {c.label}
                            <X className="size-3 opacity-70" />
                          </button>
                        </motion.li>
                      ))}
                      <motion.li key="__clear" layout={!reduce}>
                        <button type="button" onClick={() => update(() => DEFAULT_FILTERS)} className="h-7 rounded-full px-2 text-[11.5px] text-stone-500 underline underline-offset-2 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52]">
                          すべてクリア
                        </button>
                      </motion.li>
                    </AnimatePresence>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-4 pt-3 pb-6 @3xl:px-6">
            {results.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto flex max-w-md flex-col items-center py-8 text-center"
              >
                <EmptyIllustration />
                <h2 className="mt-3 text-[15px] font-semibold">条件に合う商品が見つかりませんでした</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-stone-500">条件をいくつか外すと、見つかるかもしれません。</p>
                {suggestions.length > 0 && (
                  <ul className="mt-4 flex w-full flex-col gap-1.5">
                    {suggestions.map(({ c, n }) => (
                      <li key={c.key}>
                        <button
                          type="button"
                          onClick={() => update(c.remove)}
                          className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left text-[12.5px] transition-colors hover:border-[#245b52]/50 hover:bg-[#245b52]/5 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                        >
                          <span>
                            <span className="font-semibold">{c.text}</span> を外す
                          </span>
                          <span className="rounded-full bg-[#245b52]/10 px-2 py-0.5 text-[11px] font-semibold text-[#245b52] tabular-nums">+{n}件</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 w-full">
                  <p className="text-[11px] text-stone-400">人気のキーワード</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {['リネン', 'ウール', 'トート', 'マグ', 'コーデュロイ'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update(() => ({ ...DEFAULT_FILTERS, q: k }))}
                        className="rounded-full bg-white px-3 py-1 text-[12px] text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                      >
                        #{k}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => update(() => DEFAULT_FILTERS)} className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]">
                    すべての条件をクリア
                  </button>
                </div>
              </motion.div>
            ) : (
              <LayoutGroup>
                <ul
                  className={
                    view === 'grid'
                      ? 'grid grid-cols-2 gap-x-3 gap-y-5 @xl:grid-cols-3 @3xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 @6xl:gap-x-4'
                      : 'grid grid-cols-1 gap-2.5 @6xl:grid-cols-2'
                  }
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {shown.map((p, i) => (
                      <ProductCard
                        key={p.id}
                        p={p}
                        index={i % PAGE}
                        prefer={f.colors}
                        view={view}
                        liked={liked.has(p.id)}
                        onLike={() => toggleLike(p)}
                        onQuick={(color, el) => {
                          quickOpener.current = el
                          setQuick({ id: p.id, color })
                        }}
                      />
                    ))}
                  </AnimatePresence>
                  {loadingMore && Array.from({ length: Math.min(MORE, remaining) }, (_, i) => <SkeletonCard key={`sk${i}`} view={view} />)}
                </ul>
                <motion.div layout={!reduce} className="mt-6 flex flex-col items-center gap-2.5">
                  <p className="text-[11.5px] text-stone-500 tabular-nums">
                    {results.length}件中 {Math.min(results.length, shown.length)}件を表示
                  </p>
                  <div className="h-1 w-40 overflow-hidden rounded-full bg-stone-200">
                    <motion.div className="h-full rounded-full bg-[#245b52]" initial={false} animate={{ width: `${(shown.length / results.length) * 100}%` }} transition={{ duration: reduce ? 0 : 0.5 }} />
                  </div>
                  {remaining > 0 ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      aria-busy={loadingMore}
                      className="mt-1 flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-6 text-[12.5px] font-semibold text-stone-800 transition-colors hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <>
                          <span className="size-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
                          読み込み中…
                        </>
                      ) : (
                        <>
                          もっと見る
                          <span className="text-stone-400 tabular-nums">(残り{remaining}件)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-[11.5px] text-stone-400">すべての商品を表示しました</p>
                  )}
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </motion.main>
      </div>

      {/* ドロワー(狭いとき) */}
      <AnimatePresence>
        {drawer && (
          <motion.div className="absolute inset-0 z-40 @3xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="absolute inset-0 bg-stone-900/35" onClick={closeDrawer} aria-hidden="true" />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="絞り込み"
              initial={reduce ? { opacity: 0 } : { x: '-100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '-100%' }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-[min(320px,88%)] flex-col bg-[#fbfaf7] shadow-2xl"
              ref={(el) => {
                if (el && !el.contains(document.activeElement)) el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
              }}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 px-4">
                <h2 className="flex items-center gap-1.5 text-[14px] font-bold">
                  <SlidersHorizontal className="size-4" /> 絞り込み
                </h2>
                <button type="button" onClick={closeDrawer} aria-label="絞り込みを閉じる" className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52]">
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <FilterPanel f={f} update={update} facets={facets} />
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t border-stone-200 bg-white p-3">
                <button type="button" onClick={() => update(() => DEFAULT_FILTERS)} disabled={!chips.length} className="h-10 rounded-full px-4 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#245b52] disabled:opacity-40">
                  クリア
                </button>
                <button type="button" onClick={closeDrawer} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-full bg-[#245b52] text-[12.5px] font-semibold text-white hover:bg-[#1d4a42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]">
                  <NumberFlow value={results.length} />
                  件の商品を表示
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* クイックビュー */}
      <AnimatePresence>
        {quickProduct && quick && (
          <QuickView
            key={quickProduct.id}
            p={quickProduct}
            initialColor={quick.color}
            liked={liked.has(quickProduct.id)}
            onLike={() => toggleLike(quickProduct)}
            onClose={closeQuick}
            onAdd={(qty, color, size) => {
              setCart((c) => c + qty)
              setToast({ id: Date.now(), text: `${quickProduct.name}(${COLORS[color].label}/${SIZE_NOTE[size] ?? size})を ${qty} 点カートに追加しました` })
            }}
          />
        )}
      </AnimatePresence>

      {/* トースト */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[60] flex justify-center px-4" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 460, damping: 32 }}
              className="flex max-w-[460px] items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-[12px] text-white shadow-xl"
            >
              <Check className="size-3.5 shrink-0 text-emerald-300" />
              <span className="truncate">{toast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function HeaderIcon({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <button type="button" aria-label={label} className="relative grid size-9 place-items-center rounded-full text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#245b52]">
      {children}
      {count > 0 && (
        <motion.span
          key={count}
          initial={reduce ? { opacity: 0 } : { scale: 0.4 }}
          animate={reduce ? { opacity: 1 } : { scale: [1.5, 1] }}
          transition={{ duration: 0.3 }}
          className="absolute top-0.5 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#c2412d] px-1 text-[9.5px] font-bold text-white tabular-nums"
        >
          {count}
        </motion.span>
      )}
    </button>
  )
}
