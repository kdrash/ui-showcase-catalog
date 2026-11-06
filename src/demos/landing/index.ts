import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const landingDemos: DemoEntry[] = [
  {
    id: 'saas-hero',
    title: 'SaaS Hero',
    description:
      'ダークなSaaSのヒーロー。お知らせピル・グラデーション見出し・CTA、3Dに傾いた製品スクリーンショットがスクロール/ホバーで正面に起き上がり、下にロゴのマーキー。',
    category: 'landing',
    styles: ['saas', 'dark'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'css'],
    prompt:
      'Linear/Vercel風のダークなSaaSヒーローセクションを作ってください。上から「✦ v3.0 新機能リリース →」のお知らせピル、白→グレーのグラデーション文字の大見出し(2行目は藍→ピンク→橙のグラデ)、説明文、「無料で始める」(白・発光する影)と「デモを見る」(半透明枠)のCTA、注記。その下に HTML/CSS だけで作った製品ダッシュボードのスクリーンショットを置き、親に perspective:1200px、Motion の useScroll({ container }) の scrollYProgress から rotateX(26°→0°) と scale(0.9→1) を useTransform で作り useSpring で滑らかに、ホバー中は正面(0°)に起き上がるようにします。背後にぼかしたグラデーションの光、背景に radial マスクのかかった細いグリッド線。最下部に mask-image でフェードする左右無限ロゴマーキー(CSS keyframes translateX(-50%)、hoverで一時停止)。',
    file: 'landing/SaasHero.tsx',
    component: lazy(() => import('./SaasHero').then((m) => ({ default: m.SaasHero }))),
    height: 520,
    wide: true,
  },
  {
    id: 'editorial-hero',
    title: 'Editorial Hero',
    description:
      '巨大なサンセリフとイタリックのセリフ体を混ぜた雑誌風ヒーロー。文字の間に丸く切り抜いた写真が入り、読み込み時に単語がマスクからせり上がる。下部にティッカー。',
    category: 'landing',
    styles: ['editorial', 'swiss'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'css'],
    prompt:
      '雑誌/エディトリアル風のブランドLPヒーローを作ってください。生成り色(#f3efe6)の背景に、画面幅いっぱいの巨大タイポ「MADE [写真] SLOWLY, [写真] kept LONG.」を font-size: clamp(44px, 12.5cqw, 150px)・字間 -0.04em で組み、一部の単語は Playfair Display のイタリック、句点だけ朱色。単語の間に高さ 0.78em の写真をピル型・円形・アーチ型に切り抜いてインラインで差し込みます。Motion の variants で、各単語は overflow:hidden のマスク内で y:110%→0% にスタッガー(0.09秒間隔、ease [0.22,1,0.36,1])、写真は scale 0→1 のスプリングで後から入る。replay ボタンで key を変えて再生し直し。上に細い罫線のナビ、下に黒帯の無限ティッカー(CSS keyframes)と、日本語のリード文+丸いCTAボタン(ホバーで矢印が45°回転)。',
    file: 'landing/EditorialHero.tsx',
    component: lazy(() => import('./EditorialHero').then((m) => ({ default: m.EditorialHero }))),
    height: 460,
    wide: true,
  },
  {
    id: 'testimonial-wall',
    title: 'Testimonial Wall',
    description:
      'お客様の声カードが縦に流れ続ける壁。列ごとに速度・向きが違い、ホバーした列は一時停止。上下はフェードマスク。',
    category: 'landing',
    styles: ['minimal', 'shadcn'],
    tech: ['react', 'tailwind', 'css', 'lucide'],
    prompt:
      'LPの「お客様の声」セクションを、縦に無限スクロールするテスティモニアルの壁として作ってください。カード(星評価・本文・グラデーション頭文字アバター・名前・役職)を3〜4列に分け、各列は同じ配列を2回並べて CSS keyframes で translateY(0→-50%) を linear infinite で回し、列ごとに速度(22〜36秒)と向き(animation-direction: reverse)を変えます。.col:hover .track { animation-play-state: paused } でホバー列は停止。列コンテナに mask-image: linear-gradient(transparent, black 14%, black 86%, transparent) で上下をフェード。コンテナクエリで狭い幅では2列、広いと4列。見出しに「10,000以上のチームに愛されています」と平均評価。白いカード・薄い影・淡いインディゴの背景。',
    file: 'landing/TestimonialWall.tsx',
    component: lazy(() => import('./TestimonialWall').then((m) => ({ default: m.TestimonialWall }))),
    height: 480,
    wide: true,
  },
  {
    id: 'feature-grid-glow',
    title: 'Feature Grid Glow',
    description:
      '機能紹介のベントー風グリッド。カーソルに合わせて全カードの枠線が同時に光り、各カードには小さく動くイラスト(同期バー・鍵・AI要約・共同編集カーソル・グラフ・連携の軌道)。',
    category: 'landing',
    styles: ['saas', 'dark', 'bento'],
    tech: ['react', 'motion', 'tailwind', 'lucide', 'svg'],
    prompt:
      'ダークなSaaS LPの機能紹介グリッドを作ってください。6枚のカード(2枚は col-span-2)を grid に並べ、グリッド全体の onPointerMove で各カードの getBoundingClientRect() からカーソルのカード内座標を計算し、CSS変数 --x/--y にセットします。各カードは p-px のラッパーに background: radial-gradient(320px circle at var(--x) var(--y), 紫, 水色 30%, transparent 60%) を敷いて“枠線だけが光る”ようにし、内側は角丸の黒カード。内側にも弱い radial の光をホバー時だけ表示。各カード上部に Motion で動く小さなイラスト(伸び縮みするバー、回転する点線の円と鍵、伸びるテキスト行、2人のカーソルが動き回る、pathLength で描かれる折れ線、軌道を回るアイコン)。コンテナクエリで1→2→4列。',
    file: 'landing/FeatureGridGlow.tsx',
    component: lazy(() => import('./FeatureGridGlow').then((m) => ({ default: m.FeatureGridGlow }))),
    height: 500,
    wide: true,
  },
  {
    id: 'stats-band',
    title: 'Stats Band',
    description:
      '「数字で見る」実績セクション。画面に入ると NumberFlow で数値が桁ごとに回転しながらカウントアップし、トレンドチップとスパークラインが描かれる。ライブ更新カウンター付き。',
    category: 'landing',
    styles: ['saas', 'dark'],
    tech: ['react', 'numberflow', 'motion', 'tailwind', 'lucide', 'svg'],
    prompt:
      'LPの実績数値セクションを作ってください。@number-flow/react の <NumberFlow value={...} format={...} locales="ja-JP" /> を4つ(導入企業数 12,480社 / 月間処理件数 3.2億件(format: { notation: "compact" })/ 稼働率 99.99% / 平均応答 38ms)並べ、Motion の useInView でセクションが画面に入ったら value を 0 → 実際の値に切り替えて、桁ごとに回転するアニメーションでカウントアップ。<NumberFlowGroup> で同時に動かします。各数値の下に前年比のトレンドチップ(上昇は緑・TrendingUpアイコン)と、Motion の pathLength で描かれる SVG スパークライン。右上に ping する緑の点と「いま処理中 1,842件」が 1.6秒ごとに増減するライブカウンター。濃紺の放射グラデ背景・ドットパターン・1px 区切りのグリッドカード。',
    file: 'landing/StatsBand.tsx',
    component: lazy(() => import('./StatsBand').then((m) => ({ default: m.StatsBand }))),
    height: 380,
    wide: true,
  },
  {
    id: 'newsletter-cta',
    title: 'Newsletter CTA',
    description:
      '紫→ピンク→オレンジのグラデーションCTA。メール形式を検証して、エラー時は揺れる→送信中スピナー→成功チェックと紙吹雪(デモ内canvasに限定)。',
    category: 'landing',
    styles: ['aurora', 'grain'],
    tech: ['react', 'motion', 'confetti', 'tailwind', 'lucide'],
    prompt:
      'ニュースレター登録のCTAブロックを作ってください。紫→フクシア→オレンジのグラデーションの角丸カードに、SVG feTurbulence の粒子ノイズを mix-blend-overlay で重ね、ぼかした光の玉を2つ配置。見出し・説明・白いピル型のメール入力+黒い「登録」ボタン。送信時に正規表現で検証し、不正なら Motion で x:[0,-10,9,-6,4,0] と左右に揺らして赤いリングとエラーメッセージ。正しければ1.2秒のスピナー(送信中)の後、AnimatePresence でフォームを成功表示(スプリングで出る白丸チェック+「登録ありがとうございます」)に切り替え、canvas-confetti の confetti.create(canvas, { resize: true }) で作ったデモ内専用の canvas から左右2方向に紙吹雪を発射。下に購読者アバターの重なりと人数。',
    file: 'landing/NewsletterCta.tsx',
    component: lazy(() => import('./NewsletterCta').then((m) => ({ default: m.NewsletterCta }))),
    height: 420,
    wide: true,
  },
  {
    id: 'big-footer',
    title: 'Big Footer',
    description:
      '最後のCTA・ニュースレター・SNS・4列のリンク・稼働ステータスを備えた大きなフッター。最下部に下半分が見切れる巨大ワードマークが1文字ずつせり上がる。',
    category: 'landing',
    styles: ['dark', 'editorial'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'Webサイトの大きなフッターを作ってください。上段はページ最後のCTA(大きな見出し+ライム色 #c6f432 の丸ボタン、ホバーで矢印が45°回転)。本体は左にニュースレター入力(下線だけのインプット)と丸いSNSボタン、右に「製品/会社/リソース/法務」の4列リンク(ホバーで左から伸びる下線)。下に著作権・「全システム正常稼働中」のステータス・トップへ戻るボタン(scrollTo smooth)。最下部に画面幅いっぱいの巨大ワードマーク(font-size: 19.5cqw、font-black、字間 -0.06em、上から下へ透明になるグラデーション文字)を margin-bottom マイナスで下半分を見切れさせ、Motion の whileInView で1文字ずつ y:70%→0 にせり上げる。背景はほぼ黒。',
    file: 'landing/BigFooter.tsx',
    component: lazy(() => import('./BigFooter').then((m) => ({ default: m.BigFooter }))),
    height: 520,
    wide: true,
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    description:
      '4ステップの「ご利用の流れ」。ステップ間の線がグラデーションで順番に伸び、到達したステップのアイコンが色付き、下に各ステップの小さなアニメーション図解。',
    category: 'landing',
    styles: ['minimal', 'shadcn'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'LPの「ご利用の流れ」セクションを作ってください。4つのステップ(アカウント作成→データ連携→自動化を設定→成果を確認)を、広い画面では横一列、狭い画面(コンテナクエリ)では縦に並べ、背面にグレーの線と、Motion の scaleX(縦なら scaleY)で現在ステップまで伸びる藍→ピンク→緑のグラデーション線を重ねます。到達済みステップの丸アイコンは各色で塗られ、現在ステップは layoutId で移動するリングで強調し少し拡大。2.2秒ごとに自動で進み、クリックで手動選択(自動再生停止)。下に AnimatePresence で切り替わる各ステップのミニ図解(入力欄とボタンが伸びる、連携アプリに「✓接続済」が付く、フロー行がスライドイン、棒グラフが伸びる)。白〜水色の明るい背景。',
    file: 'landing/HowItWorks.tsx',
    component: lazy(() => import('./HowItWorks').then((m) => ({ default: m.HowItWorks }))),
    height: 480,
    wide: true,
  },
]
