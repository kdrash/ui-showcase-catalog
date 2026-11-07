import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const project = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
const accountId = 'cd92bae2f4d1e9219a2024e135b13a7a'
const worker = 'ui-showcase-catalog'
const publicUrl = 'https://ui-showcase-catalog.kdrash.workers.dev/'
// Keep the CLI and its Build Output Specification version in sync.
const cf = ['exec', '--yes', '--package', 'cf@1.0.0-beta.13', '--', 'cf']
const flags = process.argv.slice(2)
const dryRun = flags[0] === '--dry-run'
const npm = process.env.npm_execpath

function runNpm(args, cwd, capture = false) {
  return execFileSync(process.execPath, [npm, ...args], {
    cwd,
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId },
    encoding: 'utf8',
    stdio: ['inherit', capture ? 'pipe' : 'inherit', 'inherit'],
  })
}

function mainRevision() {
  const git = (...args) => execFileSync('git', args, { cwd: project, encoding: 'utf8' }).trim()
  if (git('branch', '--show-current') !== 'main' || git('status', '--porcelain')) {
    throw new Error('Commit your changes and switch to a clean main branch before deploying.')
  }
  return git('rev-parse', 'HEAD')
}

async function verifyPublishedIndex(expected) {
  for (const delay of [0, 1000, 2000, 4000, 8000]) {
    await setTimeout(delay)
    try {
      const response = await fetch(publicUrl, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      if (response.ok && expected.equals(Buffer.from(await response.arrayBuffer()))) return
    } catch {
      // Allow the public URL a few attempts to pick up the new deployment.
    }
  }
  throw new Error(`Cloudflare switched the deployment, but the response at ${publicUrl} did not match this build.`)
}

if (!npm || flags.length > (dryRun ? 1 : 0)) {
  throw new Error('Usage: npm run deploy -- [--dry-run]')
}

const revision = dryRun ? undefined : mainRevision()
const cache = join(project, '.cloudflare')
mkdirSync(cache, { recursive: true })
if (realpathSync(cache) !== cache) throw new Error('Expected .cloudflare to be inside the project.')
const staging = mkdtempSync(join(cache, 'deploy-'))

try {
  const output = join(staging, '.cloudflare', 'output', 'v0')
  const workerOutput = join(output, 'workers', 'default')
  const assets = join(workerOutput, 'assets')
  mkdirSync(workerOutput, { recursive: true })
  runNpm(['run', 'build', '--', '--outDir', assets], project)
  const expected = readFileSync(join(assets, 'index.html'))
  writeFileSync(join(output, 'config.json'), JSON.stringify({ accountId, buildContext: { isPreview: false } }))
  writeFileSync(join(workerOutput, 'worker.config.json'), JSON.stringify({
    name: worker,
    compatibilityDate: '2026-11-06',
  }))

  if (dryRun) {
    runNpm([...cf, 'deploy', '--prebuilt', '--dry-run'], staging)
  } else {
    if (mainRevision() !== revision) throw new Error('main changed while the build was running.')
    const upload = runNpm([
      ...cf, 'workers', 'versions', 'create', '--prebuilt', '--message', `Deploy main ${revision.slice(0, 7)}`,
    ], staging, true)
    process.stdout.write(upload)
    const version = upload.match(/Worker Version ID:\s+([0-9a-f-]{36})/i)?.[1]
    if (!version) throw new Error('Cloudflare did not report a Worker version ID.')

    const versionsFile = join(staging, 'versions.json')
    writeFileSync(versionsFile, JSON.stringify([{ version_id: version, percentage: 100 }]))
    runNpm([...cf, 'workers', 'deployments', 'create', '--worker', worker,
      '--strategy', 'percentage', '--versions', `@${versionsFile}`], staging)
    await verifyPublishedIndex(expected)
    console.log(`Verified main ${revision.slice(0, 7)} at ${publicUrl}`)
  }
} finally {
  if (dirname(realpathSync(staging)) !== cache) throw new Error('Unexpected deployment staging directory.')
  rmSync(staging, { recursive: true, force: true })
}
