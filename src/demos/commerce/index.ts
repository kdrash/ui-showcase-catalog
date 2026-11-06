import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const commerceDemos: DemoEntry[] = [
  {
    id: 'product-card-swatches',
    title: 'Product Card Swatches',
    description:
      '色スウォッチを選ぶとインラインSVGの商品(スニーカー/トート/ボトル)の色が切り替わる商品カード。サイズ選択・お気に入り・セールバッジ・ホバーで出るクイック追加。',
    category: 'commerce',
    styles: ['minimal', 'shadcn'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'svg'],
    prompt:
      'ECサイトの商品カードを作ってください。商品画像はインラインSVGで描き(スニーカー・トートバッグ・ボトル)、主色/副色を props で受け取って fill を変えます。カード下部の色スウォッチ(斜めに2色を割った丸)をクリックすると、Motion の AnimatePresence mode="popLayout" で商品画像が横からスライドして色替え、画像背景も商品色の薄いグラデーションに。サイズはピル型ボタンで単一選択、右上のハートはタップで spring でポンと弾んで塗りつぶし、左上に割引率のセールバッジ、価格は割引価格を赤字+元値に取り消し線。画像下部にホバーで下からせり上がる「カートに入れる」ボタン(サイズ未選択時は「サイズを選択してください」、追加後1.5秒は緑の完了表示)。生成り背景・白カード・控えめな影。',
    file: 'commerce/ProductCardSwatches.tsx',
    component: lazy(() => import('./ProductCardSwatches').then((m) => ({ default: m.ProductCardSwatches }))),
    height: 460,
    wide: true,
  },
  {
    id: 'add-to-cart-fly',
    title: 'Add to Cart Fly',
    description:
      '「カートに入れる」を押すと商品サムネイルが放物線を描いてカートアイコンへ飛び込み、バッジが弾む。カートアイコンからスライドオーバーのミニカート(数量変更・小計)。',
    category: 'commerce',
    styles: ['minimal'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'ECの「カートに入れる」演出を作ってください。ボタン押下時に商品画像とカートアイコンの getBoundingClientRect() をデモのルート要素基準の座標に変換し、同じ画像の複製を absolute で重ねて Motion のキーフレームで飛ばします(x: [0, dx/2, dx] / y: [0, 上に90px膨らむ, dy] / scale: [1, .7, .15]、times: [0, .45, 1]、ease: [easeOut, easeIn] で放物線)。onAnimationComplete で複製を削除、到着タイミングでカート数を増やし、カートアイコンを rotate のキーフレームで揺らしてバッジを spring で弾ませます。カートアイコンを押すと右からスライドするミニカート(AnimatePresence・背景オーバーレイ・数量の+/-ステッパー・小計・レジへ進むボタン)。position: fixed は使わずルート内で完結。',
    file: 'commerce/AddToCartFly.tsx',
    component: lazy(() => import('./AddToCartFly').then((m) => ({ default: m.AddToCartFly }))),
    height: 420,
    wide: true,
  },
  {
    id: 'product-gallery-zoom',
    title: 'Product Gallery Zoom',
    description:
      '商品詳細ページのギャラリー。サムネイルで切り替え、メイン画像はホイール・ピンチ・ダブルクリックで拡大してドラッグで移動できる(倍率表示とリセット付き)。',
    category: 'commerce',
    styles: ['minimal', 'shadcn'],
    tech: ['react', 'zoompanpinch', 'tailwind', 'lucide'],
    prompt:
      'react-zoom-pan-pinch を使って商品詳細ページの画像ギャラリーを作ってください。左に縦並びのサムネイル(選択中はリング、狭い画面ではメイン画像の下に横並び)、メインは <TransformWrapper minScale={1} maxScale={5} doubleClick={{ mode: "toggle" }} wheel={{ step: 0.15 }}> + <TransformComponent> で、ホイール・ピンチ・ダブルクリックで拡大、ドラッグでパン。children の render 関数から zoomIn / zoomOut / resetTransform を受け取り、右下に白いピル型のコントロール(−・倍率%・+・リセット)を配置、onTransform で倍率表示を更新。サムネイル切替時は ref から resetTransform(0)。右側に商品名・星評価・価格・説明・サイズ選択・カートボタン。白基調のミニマルなデザイン。',
    file: 'commerce/ProductGalleryZoom.tsx',
    component: lazy(() => import('./ProductGalleryZoom').then((m) => ({ default: m.ProductGalleryZoom }))),
    height: 480,
    wide: true,
  },
  {
    id: 'splide-product-slider',
    title: 'Splide Product Slider',
    description:
      '日本発のスライダー Splide で、フェード切替のメインスライダーとサムネイルナビを sync() で連動。商品名・価格のオーバーレイと独自の矢印ボタン。',
    category: 'commerce',
    styles: ['dark', 'minimal'],
    tech: ['react', 'splide', 'tailwind', 'lucide'],
    prompt:
      'Splide(@splidejs/splide v4、日本製の軽量スライダー)でサムネイル連動の商品スライダーを作ってください。React では useEffect 内で new Splide(ref.current, options) を2つ作り、メインは { type: "fade", rewind: true, pagination: false, arrows: false, height: "100%" }、サムネイルは { fixedWidth: 84, fixedHeight: 56, gap: 8, isNavigation: true, focus: "center", pagination: false, arrows: false }。main.sync(thumbs) してから両方 mount()、クリーンアップで destroy(true)。CSS は "@splidejs/splide/css/core" だけ読み込み、見た目は自作(選択中サムネイルは不透明+金色の枠、他は半透明)。main.on("move") で現在の index を state に入れ、下部のグラデーションのオーバーレイに商品名・価格・タグをフェードインで表示、右上に main.go("<" / ">") を呼ぶ丸い矢印ボタン、左上に「1 / 6」の枚数表示。',
    file: 'commerce/SplideProductSlider.tsx',
    component: lazy(() => import('./SplideProductSlider').then((m) => ({ default: m.SplideProductSlider }))),
    height: 440,
  },
  {
    id: 'checkout-summary',
    title: 'Checkout Summary',
    description:
      'カートと注文サマリー。数量ステッパー・削除(AutoAnimateでリストが自動アニメ)、クーポン適用、配送方法の選択で、小計・割引・送料・合計が NumberFlow で円表記のままなめらかに変わる。',
    category: 'commerce',
    styles: ['shadcn', 'minimal'],
    tech: ['react', 'numberflow', 'autoanimate', 'tailwind', 'lucide'],
    prompt:
      'ECのカート+注文サマリー画面を作ってください。左に商品リスト(画像・商品名・バリエーション・数量の+/-ステッパー・ゴミ箱ボタン)を置き、@formkit/auto-animate の useAutoAnimate で ul に ref を付けるだけで削除時に自動アニメーション。右の注文サマリーには配送方法のラジオカード(通常配送 ¥600・1万円以上で無料 / お急ぎ便 ¥1,200)、クーポン入力(WELCOME10 で10%OFF、FREESHIP で送料無料、無効なら赤字エラー、適用後は緑のチップで外せる)、小計・割引・送料・合計・うち消費税。金額はすべて @number-flow/react の <NumberFlow value={...} format={{ style: "currency", currency: "JPY" }} locales="ja-JP" /> で、数量やクーポンが変わると桁ごとにアニメーション。カートが空になったら「商品を戻す」リンク。白いカード・薄いグレー背景・インディゴのアクセント。',
    file: 'commerce/CheckoutSummary.tsx',
    component: lazy(() => import('./CheckoutSummary').then((m) => ({ default: m.CheckoutSummary }))),
    height: 520,
    wide: true,
  },
]
