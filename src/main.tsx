import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { Solo } from './catalog/Solo'
import { DEMOS } from './catalog/registry'
import { CatalogLanguageProvider } from './catalog/i18n'

const soloId = new URLSearchParams(location.search).get('solo')

// デモ一覧のメタ情報(コンポーネント以外)を公開。自動テストやデバッグ用。
;(window as unknown as { __DEMO_META__: unknown }).__DEMO_META__ = DEMOS.map(({ component: _c, ...rest }) => rest)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogLanguageProvider>{soloId ? <Solo id={soloId} /> : <App />}</CatalogLanguageProvider>
  </StrictMode>,
)
