import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const navDemos: DemoEntry[] = [
  {
    id: 'mega-menu',
    title: 'メガメニュー',
    description: 'Radix の NavigationMenu で作る SaaS 風メガメニュー。項目間を移動するとパネルが左右にスライドし、ビューポートの大きさも滑らかに変化。',
    category: 'nav',
    styles: ['saas', 'dark'],
    tech: ['radix', 'css', 'react', 'tailwind', 'lucide'],
    prompt:
      'Radix UI(radix-ui)の NavigationMenu で SaaS サイトのヘッダーにメガメニューを作って。Root / List / Item / Trigger / Content / Link / Indicator / Viewport を使い、Content の data-motion(from-start / from-end / to-start / to-end)に左右スライドの keyframes を当て、Viewport は --radix-navigation-menu-viewport-width / height で幅と高さを transition させ、開閉は rotateX+scale で。Indicator はトリガーの下に小さな菱形の矢印。「製品」パネルはアイコン付きの2列リンク(タイトル+説明)と右側に画像付きの「新機能」カード、「リソース」は6項目のグリッド。ダーク背景・すりガラスのパネル・紫のグロー。',
    file: 'nav/MegaMenu.tsx',
    component: lazy(() => import('./MegaMenu').then((m) => ({ default: m.MegaMenu }))),
    height: 400,
    wide: true,
  },
  {
    id: 'radial-menu',
    title: 'ラジアル(パイ)メニュー',
    description: '右クリック/長押しした位置に円形のパイメニューが開く。ホバーした扇形がハイライトされ、中央にラベルを表示。',
    category: 'nav',
    styles: ['dark'],
    tech: ['motion', 'svg', 'react', 'tailwind', 'lucide'],
    prompt:
      '右クリック(onContextMenu で preventDefault)またはタッチの長押し(450ms)で、その位置に円形のパイメニューが開くUIを作って。6つの項目を SVG の path(内径34・外径96のドーナツを等分した扇形、隙間あり)で描き、各扇形の中心にアイコン、ホバーした扇形は項目ごとの色で塗ってバネで少し拡大、中央の円にホバー中の項目名を表示。開くときは Motion で scale 0.3・rotate -40° からスプリングで展開、端ではみ出さないよう位置をクランプ。選んだ項目は上部のピルに「〇〇を選択しました」と表示。ドットグリッドのダーク背景。',
    file: 'nav/RadialMenu.tsx',
    component: lazy(() => import('./RadialMenu').then((m) => ({ default: m.RadialMenu }))),
    height: 340,
  },
  {
    id: 'context-menu',
    title: 'コンテキストメニュー',
    description: 'Radix の ContextMenu をファイル一覧に適用。サブメニュー・ショートカット表示・チェック/ラジオ項目・危険操作まで揃った右クリックメニュー。',
    category: 'nav',
    styles: ['dark', 'shadcn'],
    tech: ['radix', 'react', 'tailwind', 'lucide'],
    prompt:
      'Radix UI(radix-ui)の ContextMenu で、ファイルブラウザ風のアイコングリッドを右クリックしたときのメニューを作って。Label に対象ファイル名、Item(開く ⌘O / 名前を変更 F2 / 複製 ⌘D)、Sub + SubTrigger + SubContent の「共有 ▸」(リンクをコピー / メールで送信)、Separator、CheckboxItem(お気に入り・隠しファイルを表示、ItemIndicator でチェック)、RadioGroup + RadioItem の並び順(名前/更新日/サイズ、選択で実際に並び替え)、最後に赤い「ゴミ箱に移動」。data-[highlighted] で背景色、ショートカットは右寄せの等幅文字。Portal の container をデモ内の要素にしてダークのすりガラスで。',
    file: 'nav/ContextMenuDemo.tsx',
    component: lazy(() => import('./ContextMenuDemo').then((m) => ({ default: m.ContextMenuDemo }))),
    height: 360,
  },
  {
    id: 'hide-on-scroll-header',
    title: 'スクロールで隠れるヘッダー',
    description: '下にスクロールすると隠れ、上に戻すと現れるヘッダー。少しスクロールすると縮んですりガラスになり、現在のセクションに下線が移動する。',
    category: 'nav',
    styles: ['minimal', 'ios'],
    tech: ['motion', 'react', 'tailwind'],
    prompt:
      'Motion の useScroll と useMotionValueEvent でスクロール方向を検出し、下スクロール(90px以降)でヘッダーを y:-110% に隠し、上スクロールで即座にスプリングで戻すヘッダーを作って。16px 以上スクロールしたら padding を縮め、bg-white/70 + backdrop-blur-xl + 下線の影に切替。ナビのリンクはスクロール位置から現在のセクションを判定(スクロールスパイ)し、layoutId で下線が項目間を滑るように移動、クリックで該当セクションへスムーズスクロール。ヘッダー最下部には scrollYProgress に連動する読了プログレスバー。白基調のプロダクトページ風。',
    file: 'nav/HideOnScrollHeader.tsx',
    component: lazy(() => import('./HideOnScrollHeader').then((m) => ({ default: m.HideOnScrollHeader }))),
    height: 380,
  },
  {
    id: 'css-anchor-popover',
    title: 'JSなしポップオーバー (Anchor Positioning)',
    description: 'HTML の popover 属性と CSS Anchor Positioning だけで作ったツールチップ・メニュー・ヘルプ。イベント処理の JavaScript は0行。',
    category: 'nav',
    styles: ['minimal'],
    tech: ['css', 'anchor', 'react', 'tailwind', 'lucide'],
    prompt:
      'JavaScript を使わずに、HTML の popover 属性と CSS Anchor Positioning だけでツールチップとポップオーバーメニューを作って。トリガーのボタンに anchor-name: --menu-btn、ポップオーバーに popover="auto" と id を付けてボタンに popovertarget を指定、CSS で position-anchor: --menu-btn; position-area: bottom span-left; position-try-fallbacks: flip-block, flip-inline で配置&はみ出し時に反転。表示アニメは :popover-open と @starting-style + transition-behavior: allow-discrete。ツールバーのアイコンのツールチップは :hover / :focus-visible + 隣接セレクタで表示し position-area: top。メニュー項目は popovertargetaction="hide" で閉じる。@supports not (anchor-name: --x) で未対応ブラウザの注意書きを出す。',
    file: 'nav/CssAnchorPopover.tsx',
    component: lazy(() => import('./CssAnchorPopover').then((m) => ({ default: m.CssAnchorPopover }))),
    height: 320,
  },
  {
    id: 'hamburger-overlay-menu',
    title: 'ハンバーガー&全画面メニュー',
    description: '4種類のハンバーガー→✕アイコンのモーフィングと、ボタン位置から円形に広がるフルスクリーンメニュー。リンクが下から順に現れる。',
    category: 'nav',
    styles: ['editorial', 'neobrutalism'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Motion で、3本線のハンバーガーアイコンが開閉で変形するバリエーション(✕になる cross / 矢印になる arrow / 180°回転する spin / 中央線が伸び縮みする squeeze)を作り、それぞれ span 3本の y・rotate・scaleX・opacity をスプリングで切り替えて。さらにメインのボタンを押すと、ボタン位置を中心に clip-path: circle(0%→150%) で蛍光イエローのフルスクリーンメニューが広がり、大きな太字のリンク(番号付き)が overflow-hidden の中で y:110%→0 に順番(stagger)にせり上がる。閉じるときは逆順に下がってから円が縮む。ホバーでリンクが右にずれて斜体+矢印。',
    file: 'nav/HamburgerOverlayMenu.tsx',
    component: lazy(() => import('./HamburgerOverlayMenu').then((m) => ({ default: m.HamburgerOverlayMenu }))),
    height: 360,
  },
]
