import { useEffect, useId, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Check, PenLine, Send, Sparkles, X } from 'lucide-react'

/**
 * 2種類のモーダル:
 *  1) AnimatePresence + spring で出入りするガラス調モーダル
 *  2) layoutId でボタンがそのままパネルに「モーフ」するダイアログ
 * プレビュー枠内に収めるため absolute 配置(実案件では fixed + Portal)。
 */
export function AnimatedModal() {
  const gid = useId()
  const [open, setOpen] = useState(false)
  const [compose, setCompose] = useState(false)

  useEffect(() => {
    if (!open && !compose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setCompose(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, compose])

  return (
    <LayoutGroup id={gid}>
      <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#0b0b1a] bg-[radial-gradient(circle_at_25%_30%,#7c3aed_0,transparent_40%),radial-gradient(circle_at_75%_70%,#db2777_0,transparent_40%)] text-white">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur"
          >
            <Sparkles size={16} /> Spring Modal
          </motion.button>

          {!compose && (
            <motion.button
              layoutId="compose"
              onClick={() => setCompose(true)}
              className="flex items-center gap-2 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900"
              style={{ borderRadius: 999 }}
            >
              <motion.span layoutId="compose-icon">
                <PenLine size={16} />
              </motion.span>
              <motion.span layoutId="compose-title">Morph</motion.span>
            </motion.button>
          )}
        </div>

        {/* 1) Spring modal */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute inset-0 z-10 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.85, y: 30, rotateX: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="w-full max-w-xs rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl"
                style={{ transformPerspective: 800 }}
              >
                <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-indigo-500">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-base font-semibold">Pro にアップグレード</h3>
                <p className="mt-1 text-xs text-white/60">チームでもっと速く。いつでも解約できます。</p>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {['無制限のプロジェクト', '優先サポート', '高度な分析'].map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.06 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={14} className="text-emerald-300" /> {f}
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-white/10 py-2 text-xs">
                    あとで
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl bg-white py-2 text-xs font-semibold text-zinc-900"
                  >
                    ¥980/月で始める
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2) Morphing dialog */}
        <AnimatePresence>
          {compose && (
            <>
              <motion.div
                key="compose-backdrop"
                className="absolute inset-0 z-10 bg-black/30 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCompose(false)}
              />
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center p-4">
                <motion.div
                  layoutId="compose"
                  className="pointer-events-auto w-full max-w-xs overflow-hidden bg-white p-4 text-zinc-900 shadow-2xl"
                  style={{ borderRadius: 24 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.span layoutId="compose-icon">
                      <PenLine size={16} />
                    </motion.span>
                    <motion.span layoutId="compose-title" className="text-sm font-semibold">
                      Morph
                    </motion.span>
                    <button onClick={() => setCompose(false)} className="ml-auto text-zinc-400 hover:text-zinc-900">
                      <X size={16} />
                    </button>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  >
                    <input
                      placeholder="宛先"
                      className="mt-3 w-full border-b border-zinc-200 py-1.5 text-xs outline-none"
                    />
                    <textarea
                      placeholder="ボタンがそのままダイアログに変形します (layoutId)"
                      rows={3}
                      className="mt-2 w-full resize-none rounded-lg bg-zinc-100 p-2 text-xs outline-none"
                    />
                    <button
                      onClick={() => setCompose(false)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-xs font-medium text-white"
                    >
                      <Send size={13} /> 送信
                    </button>
                  </motion.div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
