#!/usr/bin/env node
/**
 * 全デモの表示スモークテスト。
 * 各デモを ?solo=<id> で開き、次のどれかが起きたら失敗にする:
 *   - ページの未捕捉エラー(pageerror)
 *   - console.error
 *   - デモのエラー表示(DemoErrorBoundary の [data-demo-error])
 *   - 「デモが見つかりません」表示(登録漏れ)
 *
 * 使い方:
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   node scripts/smoke-demos.mjs [--base http://127.0.0.1:4173] [--concurrency 4] [--wait 2500]
 *                                [--only id1,id2] [--shots test-results/shots]
 *
 * WebGL のデモは GPU の無い CI でも描けるよう SwiftShader(ソフトウェア描画)を使う。
 */
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const base = arg('base', 'http://127.0.0.1:4173').replace(/\/$/, '')
const concurrency = Number(arg('concurrency', '4'))
const wait = Number(arg('wait', '2500'))
const only = arg('only', '')
const shotsDir = arg('shots', '')

/** src/demos/<category>/index.ts から登録済みのデモ id を集める */
function demoIds() {
  const demosDir = join(root, 'src', 'demos')
  const ids = []
  for (const dir of readdirSync(demosDir, { withFileTypes: true })) {
    const index = join(demosDir, dir.name, 'index.ts')
    if (!dir.isDirectory() || !existsSync(index)) continue
    const source = readFileSync(index, 'utf8')
    for (const match of source.matchAll(/^\s+id: '([^']+)',/gm)) ids.push(match[1])
  }
  return ids
}

/** ソフトウェア描画や開発用の注意書きなど、デモの不具合ではないメッセージ */
const IGNORED = [
  /GPU stall due to ReadPixels/i,
  /WebGL.*(performance|software)/i,
  /Automatic fallback to software WebGL/i,
  /You have Reduced Motion enabled/i,
]

let ids = demoIds()
if (only) {
  const wanted = new Set(only.split(','))
  ids = ids.filter((id) => wanted.has(id))
}
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
if (duplicates.length) {
  console.error(`Duplicate demo ids: ${[...new Set(duplicates)].join(', ')}`)
  process.exit(1)
}
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' })

const failures = []
let done = 0
const started = Date.now()

async function check(id) {
  const page = await context.newPage()
  const problems = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (!IGNORED.some((re) => re.test(text))) problems.push(`console.error: ${text}`)
  })
  try {
    await page.goto(`${base}/?solo=${encodeURIComponent(id)}&motion=full`, { waitUntil: 'load', timeout: 30_000 })
    await page.waitForTimeout(wait)
    if (await page.locator('[data-demo-error]').count()) {
      problems.push(`error boundary: ${(await page.locator('[data-demo-error]').first().innerText()).replace(/\s+/g, ' ')}`)
    }
    if (await page.getByText(/デモが見つかりません|Demo not found/).count()) problems.push('demo not found')
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${id}.png`) })
  } catch (error) {
    problems.push(`navigation: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
  }
  done += 1
  const status = problems.length ? 'FAIL' : 'ok  '
  console.log(`[${String(done).padStart(3)}/${ids.length}] ${status} ${id}`)
  if (problems.length) {
    failures.push({ id, problems })
    for (const problem of problems.slice(0, 5)) console.log(`        ${problem.slice(0, 300)}`)
  }
}

const queue = [...ids]
await Promise.all(
  Array.from({ length: Math.max(1, concurrency) }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) await check(id)
  }),
)
await browser.close()

const seconds = ((Date.now() - started) / 1000).toFixed(0)
if (failures.length) {
  console.log(`\n${failures.length} of ${ids.length} demos failed (${seconds}s): ${failures.map((f) => f.id).join(', ')}`)
  process.exit(1)
}
console.log(`\nAll ${ids.length} demos rendered without errors (${seconds}s).`)
