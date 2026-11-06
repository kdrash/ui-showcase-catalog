import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const carouselDemos: DemoEntry[] = [
  {
    id: 'embla-autoplay',
    title: 'Embla オートプレイ・カルーセル',
    description:
      'ヘッドレスな Embla Carousel に Autoplay プラグインを組み合わせたミニマルなスライダー。矢印・ドット・再生/停止ボタン付き。',
    category: 'carousel',
    styles: ['minimal'],
    tech: ['embla', 'react', 'tailwind', 'lucide'],
    prompt:
      'embla-carousel-react と embla-carousel-autoplay を使って、ミニマルなカルーセルを作ってください。オプションは loop: true、Autoplay は delay 3000ms・stopOnInteraction: false・stopOnMouseEnter: true にし、ホバー中は止まるようにします。スライドは幅78%で次のスライドが少し見えるようにし、角丸の淡いグラデーション背景にタイトルと番号を載せます。右上に丸い枠線の前へ/再生・停止/次へボタン、下部に選択中だけ横長になるドットインジケーターを置き、emblaApi の select イベントと autoplay:play / autoplay:stop イベントで状態を同期してください。配色は白〜zinc系のモノトーンで余白多めに。',
    file: 'carousels/EmblaAutoplay.tsx',
    component: lazy(() => import('./EmblaAutoplay').then((m) => ({ default: m.EmblaAutoplay }))),
  },
  {
    id: 'embla-scale-tween',
    title: 'Embla スケール Tween',
    description:
      'スクロール量に応じて中央のスライドだけ大きく、左右は縮小＆フェードするポスターカルーセル。背景のグロー色も選択スライドに追従。',
    category: 'carousel',
    styles: ['dark'],
    tech: ['embla', 'react', 'tailwind'],
    prompt:
      'embla-carousel-react で、中央のスライドが最大、左右のスライドが縮小して半透明になる「スケール Tween」カルーセルを作ってください。emblaApi の scroll / reInit / slideFocus イベントで scrollProgress() と scrollSnapList() から各スライドの中央との距離を計算し、tweenValue = 1 - |diff × 係数| を scale(0.72〜1) と opacity(0.3〜1) として DOM の style に直接書き込みます(loop 時は internalEngine().slideLooper.loopPoints で回り込みを補正)。スライドは幅55%・縦長3:4のグラデーションポスターに太いグロテスク書体のタイトル。背景はほぼ黒で、選択中スライドの色の放射グラデーションを薄く敷き、下に「01 — 06」の番号表示を付けてください。',
    file: 'carousels/EmblaScaleParallax.tsx',
    component: lazy(() => import('./EmblaScaleParallax').then((m) => ({ default: m.EmblaScaleParallax }))),
  },
  {
    id: 'swiper-coverflow',
    title: 'Swiper Coverflow',
    description:
      'Swiper の EffectCoverflow による、左右のアルバムが奥へ傾く Cover Flow 風カルーセル。選択中のアルバムで背景色と「Now Playing」が変化。',
    category: 'carousel',
    styles: ['dark'],
    tech: ['swiper', 'react', 'tailwind'],
    prompt:
      'Swiper(swiper/react)の EffectCoverflow・Pagination・Keyboard モジュールで、音楽アルバムの Cover Flow 風カルーセルを作ってください。設定は effect="coverflow"、centeredSlides、slidesPerView="auto"、grabCursor、coverflowEffect は rotate 42 / depth 140 / slideShadows true。スライドは170px角の角丸ジャケット(グラデーション＋絵文字＋下部に曲名とアーティスト)。onSlideChange で選択中アルバムを state に持ち、背景に同じグラデーションを blur-3xl で薄く敷き、下に「Now Playing 曲名 — アーティスト」を表示します。ページネーションの色は CSS 変数 --swiper-pagination-color で白に。',
    file: 'carousels/SwiperCoverflow.tsx',
    component: lazy(() => import('./SwiperCoverflow').then((m) => ({ default: m.SwiperCoverflow }))),
  },
  {
    id: 'swiper-cards',
    title: 'Swiper カードスタック',
    description:
      'Swiper の EffectCards で、トランプの山をめくるようにスワイプする搭乗券カード。',
    category: 'carousel',
    styles: ['minimal'],
    tech: ['swiper', 'react', 'tailwind', 'lucide'],
    prompt:
      'Swiper(swiper/react)の EffectCards モジュールで、カードの山を1枚ずつスワイプしてめくるカルーセルを作ってください。effect="cards"、grabCursor、cardsEffect は perSlideOffset 9 / perSlideRotate 3 / slideShadows false。Swiper 本体は幅180px×高さ240pxに固定し、各スライドは旅行の搭乗券デザイン(上部に出発/到着の空港コードと飛行機アイコン、中央に大きな絵文字、下部に点線の区切りと都市名・日付・座席)を角丸＋グラデーション背景で。左側に見出し「My Trips」と「03 / 06」の枚数表示を置き、onSlideChange で更新してください。背景は淡いピーチ色。',
    file: 'carousels/SwiperCards.tsx',
    component: lazy(() => import('./SwiperCards').then((m) => ({ default: m.SwiperCards }))),
  },
  {
    id: 'swiper-creative',
    title: 'Swiper Creative エフェクト切替',
    description:
      'Swiper の EffectCreative に prev/next の変形を渡すだけで作れる4種類の遷移(Depth / Spin / Book / Stack)をタブで切り替え。',
    category: 'carousel',
    styles: ['dark', 'editorial'],
    tech: ['swiper', 'react', 'tailwind', 'lucide'],
    prompt:
      'Swiper(swiper/react)の EffectCreative を使って、ストーリーの章をめくるフルサイズスライダーを作ってください。creativeEffect の prev / next に translate・rotate・origin・shadow を指定し、Depth(前のスライドが奥へ沈む)、Spin(Z回転しながら左右に退場)、Book(本のページのように左端/右端を軸にY回転)、Stack(次が上から重なる)の4プリセットをピル型タブで切り替えられるようにします(切替時は Swiper に key を付けて再マウント)。onSwiper でインスタンスを保持して自作の前へ/次へボタンから slidePrev / slideNext を呼び、下部に細い進捗バーを表示。スライドは濃いグラデーションに「CHAPTER 01」と大きな日本語見出し＋セリフ体イタリックの英語サブタイトル。',
    file: 'carousels/SwiperCreative.tsx',
    component: lazy(() => import('./SwiperCreative').then((m) => ({ default: m.SwiperCreative }))),
  },
  {
    id: 'infinite-marquee',
    title: '無限マーキー(ロゴ＆レビュー)',
    description:
      '2段のロゴ・レビューが逆方向に無限スクロール。ホバーで滑らかに減速して停止し、左右端はマスクでフェード。',
    category: 'carousel',
    styles: ['dark'],
    tech: ['motion', 'react', 'tailwind', 'css', 'lucide'],
    prompt:
      'Motion(motion/react)で、ロゴとユーザーレビューが2段で逆方向に流れ続ける無限マーキーを作ってください。各段はコンテンツを2回並べた w-max のトラックを用意し、useAnimationFrame で毎フレーム useMotionValue の x(%) を速度×delta だけ進め、wrap(-50, 0, x) でループさせます(要素間の余白は gap ではなく padding-right にして継ぎ目を消す)。onMouseEnter で目標速度を 0、onMouseLeave で 1 にし、現在速度を補間して滑らかに減速・再加速させます。左右端は mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent) でフェード。配色はほぼ黒の背景に white/10 の細ボーダーのチップ、Vercel 風のダークトーンで。',
    file: 'carousels/InfiniteMarquee.tsx',
    component: lazy(() => import('./InfiniteMarquee').then((m) => ({ default: m.InfiniteMarquee }))),
  },
  {
    id: 'ring-3d-carousel',
    title: '3D リングカルーセル',
    description:
      'CSS 3D でパネルを円環状に配置し、ドラッグで回転。離すと慣性を加味して正面のパネルにスプリングでスナップします。',
    category: 'carousel',
    styles: ['dark'],
    tech: ['motion', 'css', 'react', 'tailwind', 'lucide'],
    prompt:
      'CSS 3D トランスフォームと Motion(motion/react)で、8枚のパネルが円環状に並ぶ 3D リングカルーセルを作ってください。親に perspective: 900px、リング要素に transform-style: preserve-3d と rotateY(useMotionValue)を設定し、各パネルは rotateY(i × 45deg) translateZ(半径) で配置(半径 = パネル幅/2 ÷ tan(π/N) + 余白)、リング全体を z: -半径 で奥に下げます。onPan で info.delta.x を回転角に加算し、onPanEnd では velocity を加味した予測角度を 45° 単位に丸めて animate(rotation, target, { type: "spring" }) でスナップ。各パネルは useTransform で正面からの角度に応じて opacity と brightness を変え、奥のパネルを暗くします。下部に前へ/次へボタンと正面パネルの名前を表示し、背景は濃紺〜黒の放射グラデーション。',
    file: 'carousels/Ring3DCarousel.tsx',
    component: lazy(() => import('./Ring3DCarousel').then((m) => ({ default: m.Ring3DCarousel }))),
    wide: true,
  },
  {
    id: 'scroll-snap-gallery',
    title: 'CSS Scroll Snap ギャラリー',
    description:
      'ライブラリ不要の CSS scroll-snap による横スクロールギャラリー。雑誌風のエディトリアルデザインに進捗バー付き。',
    category: 'carousel',
    styles: ['editorial', 'minimal'],
    tech: ['css', 'react', 'tailwind', 'lucide'],
    prompt:
      'ライブラリを使わず CSS Scroll Snap だけで横スクロールのカルーセルを作ってください。コンテナに overflow-x: auto・scroll-snap-type: x mandatory・scroll-padding を指定し、各カード(幅62%、sm以上で40%)に scroll-snap-align: start。スクロールバーは scrollbar-width: none と ::-webkit-scrollbar で非表示にし、onScroll で scrollLeft / (scrollWidth - clientWidth) から進捗を計算して下部の細い黒線の幅に反映します。矢印ボタンは scrollBy({ left: カード幅+gap, behavior: "smooth" })。デザインは生成り色(#f4efe6)背景に Playfair Display のイタリック見出し「The Slow Journal」、記事カードはベタ色ブロック＋カテゴリラベル＋セリフ体タイトル＋著者名の雑誌風エディトリアルで。',
    file: 'carousels/ScrollSnapGallery.tsx',
    component: lazy(() => import('./ScrollSnapGallery').then((m) => ({ default: m.ScrollSnapGallery }))),
  },
  {
    id: 'swipe-deck',
    title: 'スワイプデッキ(Tinder風)',
    description:
      'カードを左右にドラッグして LIKE / NOPE。傾きとスタンプの透明度がドラッグ量に連動し、閾値を超えると画面外へ飛んでいきます。',
    category: 'carousel',
    styles: ['minimal'],
    tech: ['motion', 'react', 'tailwind', 'lucide'],
    prompt:
      'Motion(motion/react)で Tinder 風のスワイプカードデッキを作ってください。カードは absolute で重ね、奥のカードほど scale を 0.05 ずつ小さく y を 14px ずつ下げます。一番上のカードだけ drag="x" にし、useMotionValue の x から useTransform で rotate(-18°〜18°)、右ドラッグで LIKE(緑の枠スタンプ)、左で NOPE(赤)の opacity を連動させます。onDragEnd で offset.x が 110px 超または velocity.x が 650 超なら配列から削除し、AnimatePresence の custom に方向を渡して exit で x: ±420 へ飛ばし、未満なら animate(x, 0, spring) で戻します。下部に ✕ と ♥ の丸ボタン(同じ削除処理を呼ぶ)、全部なくなったら「もう一度」ボタン。カードはグラデーション背景に大きな絵文字、名前・年齢・距離・趣味タグ。',
    file: 'carousels/SwipeDeck.tsx',
    component: lazy(() => import('./SwipeDeck').then((m) => ({ default: m.SwipeDeck }))),
    height: 360,
  },
]
