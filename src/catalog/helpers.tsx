import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useCatalogLanguage } from './i18n'

/**
 * 画面に入ったときだけ children をマウントする。
 * keepMounted=false の場合は画面外に出るとアンマウント(WebGLコンテキスト数の上限対策)。
 */
export function LazyMount({
  children,
  keepMounted = true,
  className,
  style,
}: {
  children: ReactNode
  keepMounted?: boolean
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
        else if (!keepMounted) setVisible(false)
      },
      { rootMargin: keepMounted ? '400px' : '100px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [keepMounted])
  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : <DemoFallback />}
    </div>
  )
}

/** デモのコード読み込み中・マウント前の表示 */
export function DemoFallback() {
  const { t } = useCatalogLanguage()
  return <div className="grid h-full w-full place-items-center text-xs text-zinc-500">{t('loading')}</div>
}

const hoistedFontFaces = new Set<string>()

/**
 * Shadow DOM の中に children を描画し、css をその中だけに適用する。
 * 98.css / XP.css / NES.css のように要素セレクタ(button, input...)をグローバルに書き換える
 * CSSフレームワークを、ページ全体に影響させずに使うための仕組み。
 * ※ @font-face は Shadow DOM 内では効かないので document.head に移す。
 */
export function ShadowScope({
  css,
  children,
  className,
  style,
}: {
  css: string | string[]
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<ShadowRoot | null>(null)
  const sheets = Array.isArray(css) ? css : [css]
  const joined = sheets.join('\n')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }))
  }, [])

  useEffect(() => {
    const faces = joined.match(/@font-face\s*\{[^}]*\}/g)
    if (!faces) return
    const key = faces.join('\n')
    if (hoistedFontFaces.has(key)) return
    hoistedFontFaces.add(key)
    const el = document.createElement('style')
    el.dataset.hoisted = 'font-face'
    el.textContent = key
    document.head.appendChild(el)
  }, [joined])

  return (
    <div ref={hostRef} className={className} style={style}>
      {root &&
        createPortal(
          <>
            {/* color-scheme: カタログ本体は dark なので、ネイティブのボタン/入力が白文字にならないよう light に戻す */}
            <style>{':host{display:block;color-scheme:light;}' + joined}</style>
            {children}
          </>,
          root as unknown as Element,
        )}
    </div>
  )
}

export class DemoErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return <DemoErrorMessage error={this.state.error} />
    return this.props.children
  }
}

function DemoErrorMessage({ error }: { error: Error }) {
  const { t } = useCatalogLanguage()
  return (
    <div className="grid h-full w-full place-items-center p-4 text-center text-xs text-red-400">
      <div>
        <div className="mb-1 font-semibold">{t('demoError')}</div>
        <code className="break-all">{error.message}</code>
      </div>
    </div>
  )
}
