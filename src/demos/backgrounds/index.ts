import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const backgroundDemos: DemoEntry[] = [
  {
    id: 'bg-shader-waves',
    title: 'Shader Gradient Waves',
    description:
      'Stripe風に流れるメッシュグラデーション。GLSLのsimplex noiseでドメインワープし、4色をなめらかにブレンドしています。',
    category: 'background',
    styles: ['aurora'],
    tech: ['r3f', 'three', 'glsl', 'tailwind'],
    prompt:
      'ヒーローセクションの背景に、Stripeのような流れるグラデーションメッシュを React Three Fiber と自作GLSLシェーダーで作ってください。画面全体を覆う板ポリを頂点シェーダーでクリップ座標に直接出力し、フラグメントシェーダーで3D simplex noiseによるドメインワープを行い、紫(#7038ff)・水色(#6ec3f4)・マゼンタ(#ef008f)・オレンジ(#ffba27)をブレンドしてください。uTime/uResolution/uMouseのuniformをuseFrameで更新し、マウス位置でゆるやかに模様が歪むようにしてください。最後に軽いフィルムグレインを加え、上に白い大きな見出しを重ねてください。',
    file: 'backgrounds/ShaderWaves.tsx',
    component: lazy(() => import('./ShaderWaves').then((m) => ({ default: m.ShaderWaves }))),
    heavy: true,
    wide: true,
    height: 320,
  },
  {
    id: 'bg-particle-galaxy',
    title: 'Particle Galaxy',
    description: '2万個以上の点で描いた渦巻き銀河。加算合成で中心が明るく輝き、ポインタに合わせて傾きます。',
    category: 'background',
    styles: ['dark'],
    tech: ['react', 'r3f', 'three', 'tailwind'],
    prompt:
      'React Three Fiber で渦巻き銀河のパーティクル背景を作ってください。BufferGeometry に約2万点の position と color 属性を生成し(腕4本、半径5、外側ほど回転するspin、Math.powで中心に寄せたランダム性)、内側オレンジ(#ff7a3d)から外側青(#3b4dff)へ色をlerpしてください。PointsMaterial は size 0.02、vertexColors、depthWrite:false、AdditiveBlending にして光が重なるようにします。useFrameでゆっくりY軸回転させ、state.pointer に向かって group を lerp で傾けてください。背景は暗い紫の radial-gradient、左下に小さなラベルを置いてください。',
    file: 'backgrounds/ParticleGalaxy.tsx',
    component: lazy(() => import('./ParticleGalaxy').then((m) => ({ default: m.ParticleGalaxy }))),
    heavy: true,
    height: 340,
  },
  {
    id: 'bg-distort-blob',
    title: '3D Blob + Glass Hero',
    description:
      'dreiのMeshDistortMaterialでうねる3Dブロブと、その上に重ねたガラス風パネル。ブロブにホバーすると激しく揺れます。',
    category: 'background',
    styles: ['glass', 'dark'],
    tech: ['r3f', 'drei', 'three', 'tailwind', 'lucide'],
    prompt:
      'ヒーローセクションに、React Three Fiber と @react-three/drei の MeshDistortMaterial を使った「うねる3Dブロブ」を置いてください。icosahedronGeometry(半径1.35, detail 64)に紫(#7c5cff)・clearcoat 1・roughness 0.18 の材質を当て、ピンク(#ff4fd8)とシアン(#22d3ee)のポイントライトでリムを発色させてください。ホバーで distort を 0.38→0.62 に lerp して激しく揺れ、少し拡大するようにしてください。左側には Glassmorphism のパネル(bg-white/10, border-white/20, backdrop-blur-xl, rounded-3xl)で見出し・説明・白い丸ボタンを重ね、横長画面ではブロブを右寄せにしてください。',
    file: 'backgrounds/DistortBlob.tsx',
    component: lazy(() => import('./DistortBlob').then((m) => ({ default: m.DistortBlob }))),
    heavy: true,
    wide: true,
    height: 360,
  },
  {
    id: 'bg-floating-shapes',
    title: 'Floating Pastel Shapes',
    description:
      'パステルカラーの3D図形がふわふわ浮かぶ明るい背景。マウスでカメラが動くパララックス付き。',
    category: 'background',
    styles: ['clay', 'minimal'],
    tech: ['r3f', 'drei', 'three'],
    prompt:
      'React Three Fiber で、パステルカラーの3D図形(トーラスノット、正二十面体、角丸キューブ、トーラス、球、八面体、円錐)がふわふわ浮かぶ明るい背景を作ってください。各図形は @react-three/drei の <Float> で包み(speed 1〜2, rotationIntensity 1.2, floatIntensity 1.4)、MeshPhysicalMaterial(roughness 0.35, clearcoat 1)でぷっくりした質感にしてください。角丸キューブは drei の RoundedBox、床には ContactShadows で柔らかい影を落とします。useFrame で state.pointer に応じてカメラ位置を lerp し、lookAt(0,0,0) するパララックスを入れてください。背景はピンク〜ラベンダー〜水色の淡いグラデーションです。',
    file: 'backgrounds/FloatingShapes.tsx',
    component: lazy(() => import('./FloatingShapes').then((m) => ({ default: m.FloatingShapes }))),
    heavy: true,
    height: 340,
  },
  {
    id: 'bg-dot-globe',
    title: 'Dotted Globe + Arcs',
    description:
      'ドットで描いた地球儀の上を光のアークが飛び交う、SaaSのヒーローでよく見る表現。ドラッグで回転できます。',
    category: 'background',
    styles: ['dark'],
    tech: ['r3f', 'drei', 'three', 'glsl'],
    prompt:
      'React Three Fiber で、ドットで描いた地球儀と、その上を飛び交う光のアークを作ってください。フィボナッチ球面配置で約7000点を作り、疑似ノイズで間引いて大陸っぽい模様にし、CanvasTextureで作った丸テクスチャのPointsMaterialで描画してください。内側に暗い紺色の球を置いて裏側の点を隠し、BackSideの少し大きい球にフレネルのGLSLシェーダー(加算合成)で青い大気グローを付けてください。ランダムな2点を QuadraticBezierCurve3 で結んだ線を12本作り、setDrawRange で光の筋が流れるアニメーションにしてください。drei の OrbitControls(autoRotate, zoom/pan無効)でドラッグ回転、drei の Stars で背景に星を散らしてください。',
    file: 'backgrounds/DotGlobe.tsx',
    component: lazy(() => import('./DotGlobe').then((m) => ({ default: m.DotGlobe }))),
    heavy: true,
    height: 360,
  },
  {
    id: 'bg-synthwave',
    title: 'Synthwave Terrain (Vanilla Three.js)',
    description:
      'React Three Fiber を使わず素の Three.js で書いた80年代風の無限グリッド地形。ストライプの太陽とネオンの山が流れ続けます。',
    category: 'background',
    styles: ['cyberpunk', 'y2k'],
    tech: ['three', 'glsl', 'css', 'tailwind'],
    prompt:
      'React Three Fiber を使わず、素の Three.js で80年代シンセウェーブ風の背景を作ってください。useEffect 内で WebGLRenderer(alpha:true)・Scene・PerspectiveCamera を生成し、requestAnimationFrame で描画、ResizeObserver でリサイズ、アンマウント時に全リソースを dispose してください。PlaneGeometry(60x40, 120x80分割)の頂点 y をずらして中央が平らな道路・両脇がネオンの山になる地形を作り、同じ地形2枚を交互に手前へ流して無限スクロールにしてください。グリッド線は ShaderMaterial と fwidth() で描き(ピンク→山頂はシアン)、奥は空の色にフォグで溶かします。太陽は黄色→ピンクのグラデーション円の下半分を横縞で discard し、加算合成のグローを背後に置き、マウスX座標でカメラが左右に揺れるようにしてください。上部に Orbitron フォントのクローム調タイトルとスキャンラインを重ねます。',
    file: 'backgrounds/SynthwaveTerrain.tsx',
    component: lazy(() => import('./SynthwaveTerrain').then((m) => ({ default: m.SynthwaveTerrain }))),
    heavy: true,
    wide: true,
    height: 360,
  },
  {
    id: 'bg-star-warp',
    title: 'Hyperspace Warp',
    description: '星が光の筋になって迫ってくるワープ演出。ホバー中は加速して尾が長く伸びます。',
    category: 'background',
    styles: ['dark', 'cyberpunk'],
    tech: ['r3f', 'three', 'tailwind'],
    prompt:
      'React Three Fiber で、宇宙をワープ航行する背景を作ってください。星1つを線分1本(LineSegments)で表し、頂点カラーで先頭を白く尾を暗くして光跡のグラデーションにし、AdditiveBlendingで描画してください。useFrameで毎フレーム全星のzを進め、カメラを通過したら奥へリサイクルし、BufferAttributeを needsUpdate で更新します。マウスホバー中は速度を8→75へlerpして尾が伸び、カメラもゆっくりロールさせてください。中央にOrbitronフォントで「ENGAGE WARP DRIVE」と表示し、加速中は文字間隔を広げてフェードアウトさせてください。',
    file: 'backgrounds/StarWarp.tsx',
    component: lazy(() => import('./StarWarp').then((m) => ({ default: m.StarWarp }))),
    heavy: true,
  },
  {
    id: 'bg-dot-wave',
    title: 'Dot Wave Field',
    description:
      'グリッド状に並んだ約1万個の点が波打つ背景。波の計算はGPU(頂点シェーダー)で行い、ポインタ位置から波紋が広がります。',
    category: 'background',
    styles: ['dark'],
    tech: ['r3f', 'three', 'glsl'],
    prompt:
      'React Three Fiber で、床一面に並んだドット(140x70のグリッド)が波打つ背景を作ってください。<points> に ShaderMaterial を当て、頂点シェーダーで複数の sin/cos を合成して y を揺らし、gl_PointSize を距離で減衰させてください。フラグメントシェーダーでは gl_PointCoord で丸く抜き、波の高さで青→ピンクに色を変え、奥ほどフェードさせます。useFrame で Raycaster を使ってポインタと y=0 平面の交点を求め、uniform uMouse を lerp で追従させ、そこを中心に exp 減衰する波紋を足してください。上部中央に見出しを置きます。',
    file: 'backgrounds/DotWave.tsx',
    component: lazy(() => import('./DotWave').then((m) => ({ default: m.DotWave }))),
    heavy: true,
  },
  {
    id: 'bg-particle-network',
    title: 'Particle Network',
    description:
      'tsParticlesで作る、線でつながるパーティクル背景。ホバーでマウスに線が伸び、クリックで粒子が増えます。',
    category: 'background',
    styles: ['dark'],
    tech: ['tsparticles', 'react', 'tailwind'],
    prompt:
      '@tsparticles/react と @tsparticles/slim(v4)で、点同士が線でつながるネットワーク風のパーティクル背景を作ってください。ParticlesProvider の init にモジュールレベルで定義した関数(await loadSlim(engine))を渡し、options は再生成されないよう定数にしてください。fullScreen: { enable: false } で親要素サイズにし、粒子は70個(density有効)、色は paint.color に水色/藍/紫の配列、links は距離130・不透明度0.35、move は speed 0.9 で bounce。interactivity は onHover: grab(距離170)、onClick: push(4個)にしてください。背景は濃紺の radial-gradient、中央に見出しを pointer-events-none で重ねます。',
    file: 'backgrounds/ParticleNetwork.tsx',
    component: lazy(() => import('./ParticleNetwork').then((m) => ({ default: m.ParticleNetwork }))),
  },
  {
    id: 'bg-aurora',
    title: 'Aurora Gradient (Pure CSS)',
    description:
      'ぼかした光の玉を重ねて動かすオーロラ背景。JavaScriptなし、CSSだけで動いています。',
    category: 'background',
    styles: ['aurora', 'glass'],
    tech: ['css', 'svg', 'tailwind'],
    prompt:
      'JavaScriptを使わず純粋なCSSだけで、オーロラのように光がにじむヒーロー背景を作ってください。濃紺(#050816)の背景に、シアン・紫・エメラルド・ピンクの radial-gradient を持つ大きな円を4つ配置し、filter: blur(60px) と mix-blend-mode: screen で重ね、それぞれ別周期(13〜22秒)の @keyframes で移動・回転・拡縮させてください(ease-in-out, alternate)。SVG feTurbulence のノイズを data URI で全面に重ねてフィルム感を出し、prefers-reduced-motion ではアニメを止めます。中央にグラデーション文字の大見出しと、白いボタン+ガラス風ボタンを置いてください。',
    file: 'backgrounds/AuroraGradient.tsx',
    component: lazy(() => import('./AuroraGradient').then((m) => ({ default: m.AuroraGradient }))),
  },
  {
    id: 'bg-grid-spotlight',
    title: 'Grid Spotlight (Vercel/Linear style)',
    description:
      '細いグリッド線の上で、カーソル周辺だけが光るダークなヒーロー。CSS変数の書き換えだけで動くので軽量です。',
    category: 'background',
    styles: ['dark', 'minimal'],
    tech: ['css', 'tailwind', 'lucide'],
    prompt:
      'Vercel や Linear のようなダークなヒーローセクションを作ってください。背景は #0a0a0a に、2枚の linear-gradient で40px間隔の細いグリッド線(白 6%)を描き、mask-image の radial-gradient で周辺をフェードさせてください。その上に明るいグリッド(白 22%)を重ね、mask-image: radial-gradient(180px circle at var(--x) var(--y)) でカーソル周辺だけ表示し、さらに藍色のぼんやりしたスポットライトを追従させます。pointermove で CSS 変数 --x/--y を style.setProperty で直接更新し(React の再レンダーなし)、離れたらフェードアウトしてください。中央には「NEW」バッジ付きのピル型リンク、白→グレーのグラデーション文字の大見出し、白ボタンと枠線ボタンを配置します。',
    file: 'backgrounds/GridSpotlight.tsx',
    component: lazy(() => import('./GridSpotlight').then((m) => ({ default: m.GridSpotlight }))),
    wide: true,
  },
  {
    id: 'bg-gooey-blobs',
    title: 'Gooey Metaballs (SVG filter)',
    description:
      'SVGフィルターで丸同士がヌルっと融合するラバランプ風背景。マウスに付いてくる玉も他の玉と溶け合います。',
    category: 'background',
    styles: ['aurora'],
    tech: ['svg', 'css', 'tailwind'],
    prompt:
      'SVG フィルターの「gooey(メタボール)」エフェクトでラバランプ風の背景を作ってください。<filter> 内で feGaussianBlur(stdDeviation 14)→ feColorMatrix(アルファ行を 0 0 0 28 -11)を適用し、そのフィルターを CSS の filter: url(#id) で、オレンジ〜ピンク系グラデーションの丸5〜6個を含むコンテナにかけてください。丸は @keyframes で下から上へゆっくり浮かび上がり(8〜15秒、alternate、負の delay でばらけさせる)、1つはマウス位置(CSS 変数 --mx/--my)に transition 付きで追従して他の玉と融合するようにします。フィルターIDは useId で一意にし、背景は深い紫→ワインレッドのグラデーション、下部にセリフ体のイタリック見出しを置いてください。',
    file: 'backgrounds/GooeyBlobs.tsx',
    component: lazy(() => import('./GooeyBlobs').then((m) => ({ default: m.GooeyBlobs }))),
  },
  {
    id: 'bg-matrix-rain',
    title: 'Digital Rain (Canvas 2D)',
    description: '半角カタカナが降り注ぐデジタルレイン。Canvas 2D APIで直接描画し、先頭の文字だけ白く光ります。',
    category: 'background',
    styles: ['terminal', 'cyberpunk'],
    tech: ['canvas', 'tailwind'],
    prompt:
      'Canvas 2D API で、半角カタカナと数字が縦に降り注ぐ「デジタルレイン」背景を作ってください。16pxごとの列に落下位置の配列を持ち、45msごとに rgba(0,0,0,0.08) で全体を塗って残像を作り、先頭の文字は白+緑のshadowBlurで光らせ、その1つ上を緑(#22c55e)で上書きしてください。画面下を越えた列はランダムに先頭へ戻します。ResizeObserver と devicePixelRatio で高解像度対応し、アンマウント時に requestAnimationFrame を停止してください。中央に VT323 フォントで「SYSTEM ONLINE_」と点滅カーソル付きのターミナル風パネルを重ね、周辺はビネットで暗くします。',
    file: 'backgrounds/MatrixRain.tsx',
    component: lazy(() => import('./MatrixRain').then((m) => ({ default: m.MatrixRain }))),
  },
]
