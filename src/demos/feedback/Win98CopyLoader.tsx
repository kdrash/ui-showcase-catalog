import css98 from '98.css/dist/98.css?inline'
import { FileText } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ShadowScope } from '../../catalog/helpers'
import { useLoadingPreview } from './useLoadingPreview'

const css = `
.copy-desk { height:100%; box-sizing:border-box; overflow:auto; display:grid; place-items:center; color:#111; background:#008080;
  padding:12px 12px var(--solo-footer-clearance,12px); font-family:"Pixelated MS Sans Serif",Arial,sans-serif; }
.copy-window { width:min(100%,485px); box-sizing:border-box; margin:auto; }
.copy-title { display:flex; align-items:center; gap:5px; }
.copy-body { padding:4px; }
.copy-icons { position:relative; display:flex; align-items:center; justify-content:space-between; height:57px; margin:0 6px 4px; }
.copy-track { position:absolute; left:48px; right:48px; top:8px; height:42px; overflow:hidden; }
.copy-track span { position:absolute; left:0; top:12px; width:100%; }
.copy-track .copy-still { left:50%; transform:translateX(-8px); }
.copy-path { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px; }
.copy-path p { margin:3px 0; }
.copy-progress { display:flex; gap:2px; padding:3px; margin-top:7px; background:#e0dfdf; box-shadow:inset 1px 1px #808080,inset -1px -1px #fff; }
.copy-progress i { flex:1; height:13px; }
.copy-progress i.active { background:#000080; }
.copy-footer { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px; margin-top:9px; }
.copy-buttons { display:flex; gap:5px; }
.copy-buttons button { min-width:0; white-space:nowrap; }
`

function Folder({ open = false }: { open?: boolean }) {
  return (
    <svg width="42" height="34" viewBox="0 0 42 34" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M3 6h14l4 4h16v21H3Z" fill="#ffdf66" stroke="#4f4300" strokeWidth="2" />
      <path d={open ? 'M4 14h35l-6 15H4Z' : 'M4 12h32v17H4Z'} fill={open ? '#f4bf37' : '#ffd954'} stroke="#7a5a0d" />
      <path d="M5 12h30M5 13v15" fill="none" stroke="#fff4a7" />
    </svg>
  )
}

const filenames = ['WALLPAPER.BMP', 'TRACK_01.WAV', 'EXTRAS.DAT']

export function Win98CopyLoader() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'loading' })
  const reduced = useReducedMotion()
  const { ref, id, progress, cancelled, done, running, restart, cancel } = useLoadingPreview(5600)
  const file = filenames[Math.min(filenames.length - 1, Math.floor(progress * filenames.length / 100))]

  return (
    <div ref={ref} className="relative isolate h-full w-full overflow-hidden">
      <ShadowScope css={[css98, css]} className="h-full w-full">
        <div className="copy-desk">
          <section className="window copy-window">
            <div className="title-bar">
              <div className="title-bar-text copy-title"><FileText size={13} aria-hidden="true" />{t('copy.title')}</div>
            </div>
            <div className="window-body copy-body">
              <div className="copy-icons" aria-hidden="true">
                <Folder open />
                <div className="copy-track">
                  {running && reduced && <span className="copy-still"><FileText size={17} fill="#fff" color="#000080" /></span>}
                  {running && !reduced && [0, 1, 2].map((sheet) => (
                    <motion.span key={`${id}-${sheet}`}
                      initial={{ x: '-8%', y: 8, opacity: 0 }}
                      animate={{ x: ['-8%', '92%'], y: [8, -9, 8], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1.3, repeat: Infinity, delay: sheet * .35, ease: 'linear' }}>
                      <FileText size={17} fill="#fff" color="#000080" />
                    </motion.span>
                  ))}
                </div>
                <Folder />
              </div>
              <div className="copy-path">
                <p><code>{file}</code></p>
                <p><code>D:\BONUS → C:\ARCHIVE</code></p>
              </div>
              <div className="copy-progress" role="progressbar" aria-label={t('copy.progress')} aria-valuenow={progress}>
                {Array.from({ length: 24 }, (_, index) => <i key={index} className={progress > index * 100 / 24 ? 'active' : ''} />)}
              </div>
              <div className="copy-footer">
                <span role="status">{t(cancelled ? 'cancelled' : done ? 'copy.done' : 'copy.working')}</span>
                <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
                <div className="copy-buttons">
                  <button type="button" onClick={cancel} disabled={!running}>{t('cancel')}</button>
                  <button type="button" onClick={restart}>{t('copy.restart')}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ShadowScope>
    </div>
  )
}
