import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const cardDemos: DemoEntry[] = [
  {
    id: 'tilt-card',
    title: '3D チルトカード',
    description:
      'カーソル位置に合わせてカードが立体的に傾き、光の反射(グレア)が追従。中の要素が translateZ で浮き上がるパララックス付き。',
    category: 'card',
    styles: ['dark'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Motion(motion/react)で、マウスに追従して3Dに傾く商品カードを作ってください。onPointerMove でカード内の相対位置(0〜1)を useMotionValue に入れ、useSpring(stiffness 180, damping 18)で滑らかにしてから useTransform で rotateX(16°〜-16°)と rotateY(-16°〜16°)に変換します。親に perspective: 900px、カードに transform-style: preserve-3d を指定し、中の要素(絵文字・タイトル・価格)をそれぞれ translateZ(30〜80px) で浮かせて奥行きを出します。useMotionTemplate でポインタ位置の radial-gradient グレアを mix-blend-mode: overlay で重ね、box-shadow も傾きと逆方向にずらしてください。onPointerLeave で中央(0.5)に戻します。カードは紫→ピンク→オレンジのグラデーション、背景は濃紫の放射グラデーション。',
    file: 'cards/TiltCard.tsx',
    component: lazy(() => import('./TiltCard').then((m) => ({ default: m.TiltCard }))),
    height: 340,
  },
  {
    id: 'spotlight-card',
    title: 'スポットライト・ボーダーカード',
    description:
      'カーソル付近のボーダーだけがぼんやり光る、Linear / Vercel 風のダークな機能紹介カードグリッド。',
    category: 'card',
    styles: ['dark'],
    tech: ['react', 'css', 'tailwind', 'lucide'],
    prompt:
      'ダークテーマの機能紹介カードを2×2グリッドで並べ、カーソル付近のボーダーだけが光る「スポットライトカード」を作ってください。グリッド全体の onMouseMove で、各カードの getBoundingClientRect からの相対座標を CSS 変数 --x / --y に style.setProperty で書き込みます(React の再レンダーはしない)。各カードは外枠 div に padding 1px と background: radial-gradient(220px circle at var(--x) var(--y), rgba(129,140,248,0.9), transparent 40%), rgba(255,255,255,0.08) を指定し、内側に背景 #0c0c10 の角丸 div を重ねてボーダーに見せます。さらに内側にホバー時だけ表示される大きく薄い同色の radial-gradient を重ねてください。アイコンは lucide-react、背景はほぼ黒(#050507)。',
    file: 'cards/SpotlightCard.tsx',
    component: lazy(() => import('./SpotlightCard').then((m) => ({ default: m.SpotlightCard }))),
    height: 340,
  },
  {
    id: 'flip-card',
    title: 'フリップカード(CSS / Motion)',
    description:
      '表裏が3D回転で切り替わる単語帳カード。左はホバー＋CSS transition、右はクリック＋Motion のスプリングで実装の違いを比較できます。',
    category: 'card',
    styles: ['minimal'],
    tech: ['motion', 'css', 'tailwind', 'react', 'lucide'],
    prompt:
      '表と裏が Y 軸回転でひっくり返るフラッシュカード(単語帳)を作ってください。親要素に perspective: 800px、回転する本体に transform-style: preserve-3d、表面と裏面を absolute で重ねてどちらも backface-visibility: hidden、裏面だけ最初から rotateY(180deg) にしておきます。1枚目は CSS のみで、Tailwind の group-hover:[transform:rotateY(180deg)] と transition-duration 700ms・cubic-bezier(.2,.8,.2,1) で反転。2枚目は Motion(motion/react)の animate={{ rotateY: flipped ? 180 : 0 }} を type: "spring"(stiffness 220, damping 18)でクリック/Enter キーにより反転させてください。表は白地に大きな漢字、裏は色ベタ(インディゴ/ローズ)に読み・英訳・例文。',
    file: 'cards/FlipCard.tsx',
    component: lazy(() => import('./FlipCard').then((m) => ({ default: m.FlipCard }))),
  },
  {
    id: 'glass-credit-card',
    title: 'Glassmorphism クレジットカード',
    description:
      '背後でゆっくり動くカラフルなぼかし円を、すりガラス越しに透かして見せるクレジットカード。番号の表示切替付き。',
    category: 'card',
    styles: ['glass'],
    tech: ['motion', 'css', 'tailwind', 'react', 'svg', 'lucide'],
    prompt:
      'Glassmorphism のクレジットカード UI を作ってください。背景は濃紺(#0f0c29)で、フューシャ・シアン・アンバーの大きな円を blur-2xl でぼかし、Motion(motion/react)の animate={{ x: [...], y: [...] }} を repeat: Infinity, repeatType: "mirror" で8〜11秒かけてゆっくり動かします。カードは 290×180px、背景 rgba(255,255,255,0.1)、backdrop-filter: blur(24px)、1px の白30%ボーダー、角丸16px、上に左上から白25%→透明のグラデーションを重ねてガラスの光沢を表現。中身は銀行名、非接触アイコン、SVG で描いた金色の IC チップ、等幅フォントのカード番号(目のアイコンで全桁表示を切替)、名義・有効期限、重なった2つの円のブランドマーク。ホバーで whileHover={{ y: -6, rotateX: 6, rotateY: -6 }} と少し浮かせてください。',
    file: 'cards/GlassCreditCard.tsx',
    component: lazy(() => import('./GlassCreditCard').then((m) => ({ default: m.GlassCreditCard }))),
  },
  {
    id: 'holo-card',
    title: 'ホログラム・トレカ',
    description:
      'カーソルを動かすと虹色の箔が流れ、光の反射が追従するトレーディングカード風のホロ表現。',
    category: 'card',
    styles: ['y2k', 'dark'],
    tech: ['react', 'css', 'tailwind'],
    prompt:
      'トレーディングカード風のホログラム(箔押し)カードを作ってください。pointermove でカード上の位置を計算し、React の state を使わず CSS 変数(--mx, --my, --rx, --ry, --pos, --o)を element.style.setProperty で直接更新します。カードは transform: rotateX(var(--rx)) rotateY(var(--ry))(最大±12°、transition 0.15s)で傾け、上に2枚のレイヤーを重ねます: (1) 虹色の repeating-linear-gradient(115deg, ピンク→黄→ミント→青→紫)と細い斜線パターンを background-size 300%、background-position: var(--pos) で動かし mix-blend-mode: color-dodge、(2) radial-gradient(circle at var(--mx) var(--my), 白65%, transparent 45%) を mix-blend-mode: overlay。pointerleave で初期値に戻します。カード枠は銀色のグラデーション、中はキャラクター名・HP・イラスト枠・技2つ・フレーバーテキスト・レアリティ表記。',
    file: 'cards/HoloCard.tsx',
    component: lazy(() => import('./HoloCard').then((m) => ({ default: m.HoloCard }))),
    height: 380,
  },
  {
    id: 'expandable-cards',
    title: '展開カード(共有レイアウト)',
    description:
      '一覧のカードをクリックすると、画像とタイトルが滑らかに移動・拡大して詳細パネルになる共有要素トランジション。',
    category: 'card',
    styles: ['minimal'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Motion(motion/react)の layoutId を使って、カード一覧から詳細パネルへ滑らかに拡大する「共有要素トランジション」を作ってください。一覧の各カード(motion.li)・画像・タイトルに `${useId()}-card-${id}` のような layoutId を付け、選択中のアイテムがあれば同じ layoutId を持つ詳細パネルを AnimatePresence の中に描画します。背景には半透明＋少しぼかしたオーバーレイを opacity でフェードさせ、クリックか Esc キーで閉じます。詳細の説明文・調理時間・カロリー・材料タグはタイトル移動の後に delay 0.12s でフェードインさせ、角丸は className ではなく style の borderRadius で指定して拡大中に歪まないようにしてください。題材はレシピ(絵文字＋グラデーションのサムネイル)、全体は生成りのミニマルなトーン。',
    file: 'cards/ExpandableCards.tsx',
    component: lazy(() => import('./ExpandableCards').then((m) => ({ default: m.ExpandableCards }))),
    height: 340,
  },
  {
    id: 'neumorphic-player',
    title: 'Neumorphism ミュージックプレイヤー',
    description:
      '背景と同色の要素に明暗2方向の影を付けて、浮き出し・凹みを表現した音楽プレイヤー。再生中はボタンが凹み、ジャケットが回転します。',
    category: 'card',
    styles: ['neumorphism'],
    tech: ['react', 'css', 'tailwind', 'lucide'],
    prompt:
      'Neumorphism(ニューモーフィズム)デザインの音楽プレイヤーカードを作ってください。背景色は #e4e9f0 で、カードやボタンも同じ色にし、凸は box-shadow: 8px 8px 16px #bec8d6, -8px -8px 16px #ffffff、凹は同じ影を inset にして表現します。上部に戻る/メニューの丸ボタンと「NOW PLAYING」、中央に二重の円の中で回転するパステルの conic-gradient ジャケット(CSS @keyframes と animation-play-state で再生中のみ回転)、曲名・アーティストとお気に入りボタン(押すと凹んでハートが赤く塗られる)、凹んだトラックの進捗バーと凸のつまみ、経過/全体時間、下部に前の曲・再生/一時停止(大きく、再生中は凹む)・次の曲ボタン。再生中は setInterval で時間を進めてください。アイコンは lucide-react、アクセントはバイオレット。',
    file: 'cards/NeumorphicPlayer.tsx',
    component: lazy(() => import('./NeumorphicPlayer').then((m) => ({ default: m.NeumorphicPlayer }))),
    height: 400,
  },
  {
    id: 'brutalist-pricing',
    title: 'Neo-Brutalism 料金プラン',
    description:
      '太い黒枠・ベタ塗りの原色・ずらした黒い影が特徴のネオブルータリズムな料金表。月払い/年払いの切替で価格がスライドして変わります。',
    category: 'card',
    styles: ['neobrutalism'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Neo-Brutalism スタイルの料金プラン(3カラム)を作ってください。背景は黄色(#ffe66d)に黒の小さなドット柄、フォントは Space Grotesk。カードは border 3px solid black、box-shadow: 6px 6px 0 #000(ぼかしなし)、背景は白・ピンク(#ff90e8)・水色(#90e0ff)のベタ塗りで、人気プランには少し傾けた赤いステッカー「人気No.1」を角に貼ります。ボタンは同じく黒枠＋4px のずらし影で、hover で -2px 浮いて影が 6px に、active で 4px 沈んで影が消えるようにしてください。月払い/年払いトグルは四角い黒枠のスイッチで、Motion(motion/react)のスプリングでつまみを移動。価格は AnimatePresence mode="popLayout" で key を変えて下から上へスライドさせて切り替えます。チェックリストは黒枠の正方形にチェックアイコン。',
    file: 'cards/BrutalistPricing.tsx',
    component: lazy(() => import('./BrutalistPricing').then((m) => ({ default: m.BrutalistPricing }))),
    wide: true,
    height: 400,
  },
  {
    id: 'animated-border-card',
    title: 'アニメーションボーダー 3種',
    description:
      'カードの枠線をグラデーションが回り続ける3つの実装比較: CSS @property による虹色、Motion で回す光の筋、SVG の点線マーチングアンツ。',
    category: 'card',
    styles: ['dark'],
    tech: ['css', 'motion', 'svg', 'tailwind', 'react', 'lucide'],
    prompt:
      'ダーク背景で、枠線がアニメーションするカードを3種類作ってください。(1) CSS の @property --angle(syntax: "<angle>")を定義して @keyframes で 0→360deg に回し、background: conic-gradient(from var(--angle), 赤, 黄, 緑, 水色, 紫, 赤) の要素に padding 2px で内側に黒いカードを重ねた虹色ボーダー。同じ要素を blur-xl・opacity 60% で背後に置いてグローも付けます。(2) カードの2倍以上の正方形に conic-gradient(transparent 0〜290deg, シアン, 紫, transparent) を塗り、Motion(motion/react)で animate={{ rotate: 360 }}, repeat: Infinity, ease: "linear" で回し、overflow: hidden の親と内側の黒いカードで「光の筋」だけが枠を一周するように。(3) SVG の rect に stroke-dasharray="10 4" と stroke-dashoffset の CSS アニメーションを付けたマーチングアンツの点線枠(ファイルドロップ領域風)。',
    file: 'cards/AnimatedBorderCard.tsx',
    component: lazy(() => import('./AnimatedBorderCard').then((m) => ({ default: m.AnimatedBorderCard }))),
    wide: true,
    height: 300,
  },
  {
    id: 'hover-reveal-cards',
    title: 'ホバーリビール商品カード',
    description:
      'ホバーすると下から情報パネルがせり上がり、説明・カラー・カートボタンが現れる EC 向け商品カード。JS なしで Tailwind の group-hover のみ。',
    category: 'card',
    styles: ['minimal'],
    tech: ['tailwind', 'css', 'lucide'],
    prompt:
      'Tailwind CSS の group / group-hover だけで(JavaScript なしで)、ホバーで情報が現れる商品カードを4枚横並びで作ってください。カードは高さ240px・角丸・overflow-hidden・パステルのグラデーション背景で、左上にカテゴリのピル、中央に大きな商品(絵文字)。下部の白い情報パネルは translate-y-[calc(100%-58px)] で商品名と価格だけ見える状態にしておき、group-hover:translate-y-0 で cubic-bezier(.2,.8,.2,1)・500ms でせり上げます。せり上がると説明文が少し遅れて(delay-100)フェードインし、カラーバリエーションの丸、黒い「カートに追加」ボタンが見えるように。同時に商品は group-hover で上に移動・-12°回転・縮小し、カードの影も強くしてください。',
    file: 'cards/HoverRevealCards.tsx',
    component: lazy(() => import('./HoverRevealCards').then((m) => ({ default: m.HoverRevealCards }))),
    wide: true,
    height: 320,
  },
  {
    id: 'stacked-notifications',
    title: 'スタック通知(iOS 風)',
    description:
      'ロック画面風に重なった通知が、ホバー(タッチはタップ)でリスト状に展開。新着は上から入り、×で右へ消えます。',
    category: 'card',
    styles: ['glass'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Motion(motion/react)で iOS のロック画面のような「重なった通知スタック」を作ってください。通知カード(高さ64px、白75%＋backdrop-blur-xl、角丸16px)は absolute で重ね、折りたたみ時は index ごとに y を 9px ずつ下げて scale を 5% ずつ小さく(4枚目以降は opacity 0、2枚目以降は中身を非表示)、ホバー時は y = index × 72px に展開します(どちらも type: "spring", stiffness 320, damping 30)。タッチ端末は pointerType を見てタップで開閉。新着通知はボタンで先頭に追加し AnimatePresence の initial で上から落ちてくるように、展開中だけ表示される×ボタンで exit={{ x: 120, opacity: 0 }} で右へ消します。各通知はアプリの色付き角丸アイコン・アプリ名・時刻・タイトル・本文。背景は紫→ピンク→オレンジの壁紙グラデーションに大きな時計「9:41」。',
    file: 'cards/StackedNotifications.tsx',
    component: lazy(() => import('./StackedNotifications').then((m) => ({ default: m.StackedNotifications }))),
    height: 400,
  },
]
