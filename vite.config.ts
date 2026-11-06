import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js 本体だけで ~740kB あるため(3Dデモ表示時のみ遅延ロード)
    chunkSizeWarningLimit: 800,
  },
  css: {
    lightningcss: {
      // 98.css / XP.css には `progress:not([value]):before:not([value])` のような
      // 仕様上不正なセレクタが含まれており、本番ビルドの CSS 圧縮(lightningcss)がエラーになる。
      // errorRecovery で不正なルールだけ捨てて(警告のみ)ビルドを続行する。
      errorRecovery: true,
    },
  },
  optimizeDeps: {
    // デモは React.lazy で遅延 import されるため、開発サーバーが依存を後から発見すると
    // 「再最適化 → 全ページリロード」が起きる。よく使う依存は起動時にまとめて事前バンドルしておく。
    include: [
      'animejs', '@react-spring/web', '@use-gesture/react', 'lenis', 'lenis/react', '@formkit/auto-animate/react',
      '@number-flow/react', '@gsap/react', 'gsap/Flip', 'gsap/Draggable', 'gsap/InertiaPlugin', 'gsap/MorphSVGPlugin',
      'gsap/DrawSVGPlugin', 'gsap/MotionPathPlugin', 'gsap/Observer', 'gsap/CustomEase', 'gsap/Physics2DPlugin',
      '@react-three/postprocessing', 'postprocessing', '@react-three/rapier', 'cobe', 'ogl', '@paper-design/shaders-react',
      'zdog', 'matter-js', 'p5', 'pixi.js', 'tone', 'roughjs', 'rough-notation', 'perfect-freehand', 'konva', 'react-konva',
      'd3', 'd3-sankey', 'topojson-client', 'echarts', 'echarts/core', 'echarts/charts', 'echarts/components',
      'echarts/renderers', 'chart.js', 'react-chartjs-2', '@xyflow/react', '@tanstack/react-table', '@tanstack/react-virtual',
      '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'react-day-picker', 'react-day-picker/locale', 'date-fns',
      'date-fns/locale', 'react-colorful', 'react-hook-form', 'zod', '@hookform/resolvers/zod', 'radix-ui',
      '@headlessui/react', 'input-otp', 'react-dropzone', 'react-resizable-panels', '@tiptap/react', '@tiptap/react/menus',
      '@tiptap/starter-kit', '@tiptap/extensions', '@tiptap/extension-highlight', '@tiptap/extension-list', 'codemirror',
      '@codemirror/lang-javascript', '@codemirror/lang-html', '@codemirror/theme-one-dark', '@codemirror/view',
      '@codemirror/state', '@xterm/xterm', '@xterm/addon-fit', 'shiki', 'react-markdown', 'remark-gfm', 'driver.js',
      'react-zoom-pan-pinch', '@splidejs/splide', 'lottie-web', 'atropos', 'atropos/react', 'swapy', 'wavesurfer.js',
    ],
  },
})
