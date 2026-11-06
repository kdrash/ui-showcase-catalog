import { NavigationMenu } from 'radix-ui'
import { ArrowRight, Blocks, BookOpen, Bot, ChevronDown, Code2, LifeBuoy, Newspaper, Rocket, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react'
import { art } from '../_shared/art'


const CSS = `
@keyframes mm-enter-r{from{opacity:0;transform:translateX(160px)}to{opacity:1;transform:none}}
@keyframes mm-enter-l{from{opacity:0;transform:translateX(-160px)}to{opacity:1;transform:none}}
@keyframes mm-exit-r{from{opacity:1;transform:none}to{opacity:0;transform:translateX(160px)}}
@keyframes mm-exit-l{from{opacity:1;transform:none}to{opacity:0;transform:translateX(-160px)}}
@keyframes mm-scale-in{from{opacity:0;transform:rotateX(-20deg) scale(.95)}to{opacity:1;transform:none}}
@keyframes mm-scale-out{from{opacity:1;transform:none}to{opacity:0;transform:rotateX(-10deg) scale(.95)}}
.mm-content[data-motion=from-start]{animation:mm-enter-l .25s ease}
.mm-content[data-motion=from-end]{animation:mm-enter-r .25s ease}
.mm-content[data-motion=to-start]{animation:mm-exit-l .25s ease}
.mm-content[data-motion=to-end]{animation:mm-exit-r .25s ease}
.mm-viewport{height:var(--radix-navigation-menu-viewport-height);width:var(--radix-navigation-menu-viewport-width);transition:width .3s ease,height .3s ease;transform-origin:top center}
.mm-viewport[data-state=open]{animation:mm-scale-in .2s ease}
.mm-viewport[data-state=closed]{animation:mm-scale-out .2s ease}
.mm-indicator{transition:transform .25s ease,width .25s ease,opacity .2s}
`

type Link = { icon: typeof Zap; title: string; desc: string; color: string }
const PRODUCTS: Link[] = [
  { icon: Zap, title: 'オートメーション', desc: 'ノーコードで業務フローを自動化', color: 'text-amber-300 bg-amber-400/10' },
  { icon: Bot, title: 'AIアシスタント', desc: '社内データに答えるチャットボット', color: 'text-violet-300 bg-violet-400/10' },
  { icon: Blocks, title: 'インテグレーション', desc: '200以上のSaaSと連携', color: 'text-sky-300 bg-sky-400/10' },
  { icon: ShieldCheck, title: 'セキュリティ', desc: 'SSO・監査ログ・権限管理', color: 'text-emerald-300 bg-emerald-400/10' },
]
const RESOURCES: Link[] = [
  { icon: BookOpen, title: 'ドキュメント', desc: 'APIリファレンスとガイド', color: 'text-zinc-200 bg-white/5' },
  { icon: Code2, title: 'SDK', desc: 'TypeScript / Python / Go', color: 'text-zinc-200 bg-white/5' },
  { icon: Newspaper, title: 'ブログ', desc: 'リリースノートと事例', color: 'text-zinc-200 bg-white/5' },
  { icon: LifeBuoy, title: 'サポート', desc: '24時間対応のヘルプセンター', color: 'text-zinc-200 bg-white/5' },
  { icon: Users, title: 'コミュニティ', desc: 'Discord で質問・共有', color: 'text-zinc-200 bg-white/5' },
  { icon: Rocket, title: 'テンプレート', desc: 'すぐ使える100種類のレシピ', color: 'text-zinc-200 bg-white/5' },
]

function Item({ l }: { l: Link }) {
  const I = l.icon
  return (
    <NavigationMenu.Link asChild>
      <a href="#" onClick={(e) => e.preventDefault()} className="group flex gap-3 rounded-lg p-2.5 transition hover:bg-white/5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${l.color}`}>
          <I size={17} />
        </span>
        <span>
          <span className="block text-sm font-medium text-white">{l.title}</span>
          <span className="block text-xs text-zinc-400">{l.desc}</span>
        </span>
      </a>
    </NavigationMenu.Link>
  )
}

const trigger =
  'group inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-zinc-300 outline-none transition hover:text-white data-[state=open]:text-white'

export function MegaMenu() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#08080c] font-sans text-white">
      <style>{CSS}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(124,58,237,.25),transparent_60%)]" />
      <header className="relative z-10 flex items-center gap-4 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Sparkles size={14} />
          </span>
          Flowly
        </div>
        <NavigationMenu.Root defaultValue="products" delayDuration={80} className="relative flex-1">
          <NavigationMenu.List className="relative flex items-center gap-0.5">
            <NavigationMenu.Item value="products">
              <NavigationMenu.Trigger className={trigger}>
                製品 <ChevronDown size={13} className="transition group-data-[state=open]:rotate-180" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="mm-content absolute top-0 left-0 w-[min(560px,calc(100vw-40px))] p-3">
                <div className="grid grid-cols-[1fr_190px] gap-3">
                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    {PRODUCTS.map((l) => (
                      <Item key={l.title} l={l} />
                    ))}
                  </div>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="group relative flex flex-col justify-end overflow-hidden rounded-xl p-3"
                    style={{ backgroundImage: `url(${art('gradient', 5, 400, 400)})`, backgroundSize: 'cover' }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="relative text-[10px] font-semibold tracking-wider text-fuchsia-200 uppercase">New</span>
                    <span className="relative text-sm font-semibold">Flowly AI 2.0 を発表</span>
                    <span className="relative mt-1 inline-flex items-center gap-1 text-xs text-zinc-200">
                      詳しく見る <ArrowRight size={12} className="transition group-hover:translate-x-1" />
                    </span>
                  </a>
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item value="resources">
              <NavigationMenu.Trigger className={trigger}>
                リソース <ChevronDown size={13} className="transition group-data-[state=open]:rotate-180" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="mm-content absolute top-0 left-0 w-[min(520px,calc(100vw-40px))] p-3">
                <div className="grid grid-cols-2 gap-0.5">
                  {RESOURCES.map((l) => (
                    <Item key={l.title} l={l} />
                  ))}
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link href="#" onClick={(e) => e.preventDefault()} className={trigger}>
                料金
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link href="#" onClick={(e) => e.preventDefault()} className={trigger}>
                導入事例
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Indicator className="mm-indicator top-full z-10 flex h-2 items-end justify-center overflow-hidden data-[state=hidden]:opacity-0">
              <div className="relative top-[60%] h-2.5 w-2.5 rotate-45 rounded-tl-sm border-t border-l border-white/10 bg-zinc-900" />
            </NavigationMenu.Indicator>
          </NavigationMenu.List>
          <div className="absolute top-full left-0 flex w-full justify-start pt-2 [perspective:2000px]">
            <NavigationMenu.Viewport className="mm-viewport relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/60 backdrop-blur" />
          </div>
        </NavigationMenu.Root>
        <div className="hidden items-center gap-2 sm:flex">
          <button className="text-sm text-zinc-300 hover:text-white">ログイン</button>
          <button className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900">無料で始める</button>
        </div>
      </header>
      <div className="relative px-5 pt-40 text-center">
        <h2 className="text-2xl font-bold tracking-tight">チームの仕事を、自動で流れるように。</h2>
        <p className="mt-2 text-sm text-zinc-400">メニューにホバーするとメガメニューが開きます</p>
      </div>
    </div>
  )
}
