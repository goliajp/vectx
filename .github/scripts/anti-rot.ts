#!/usr/bin/env bun
/**
 * Anti-rot checks for vectx project documentation.
 *
 * Runs in CI on push / PR to develop and master. Fails when:
 *
 *   1. A markdown doc (README / BOUNDARY) references a project path
 *      (src/..., web/..., tests/..., fixtures/..., publish-stubs/...,
 *      .github/..., or another top-level *.md) that no longer exists.
 *   2. A function name claimed in BOUNDARY's glossary (recognize,
 *      emitDsl, renderRecognized, parseSvg) is no longer findable
 *      anywhere in src/.
 *   3. The fixture-name list claimed in BOUNDARY goes out of sync with
 *      the .svg files in fixtures/ — either direction: claimed-but-
 *      missing, or on-disk-but-undeclared.
 *
 * This script is intentionally dependency-free. Add new check functions
 * here when a new class of rot starts mattering.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dirname, '..', '..')

let failed = 0
const fail = (msg: string) => {
  console.error(`✗ ${msg}`)
  failed++
}
const ok = (msg: string) => {
  console.log(`✓ ${msg}`)
}
const heading = (s: string) => console.log(`\n── ${s} ──`)

// ─────────────────────────────────────────────────────────────────────
// Load docs
// ─────────────────────────────────────────────────────────────────────
const DOC_NAMES = ['README.md', 'BOUNDARY.md']
const docs = DOC_NAMES.map((n) => ({
  name: n,
  path: join(REPO_ROOT, n),
}))
  .filter(({ path }) => existsSync(path))
  .map(({ name, path }) => ({ name, path, text: readFileSync(path, 'utf-8') }))

console.log(`vectx anti-rot · scanning ${docs.length} docs (${docs.map((d) => d.name).join(', ')})`)

// Strip fenced code blocks before path matching — they're examples, not
// load-bearing assertions about the repo layout.
const stripFences = (md: string) => md.replace(/```[\s\S]*?```/g, '')

// ─────────────────────────────────────────────────────────────────────
// Check 1 — referenced paths exist
// ─────────────────────────────────────────────────────────────────────
heading('check 1 · referenced paths exist')

// Matches: ./relative, top-level project dirs, and known top-level md/file names.
// Deliberately EXCLUDES paths starting with `~/` (those refer to user-home like
// ~/.claude/skills/vectx/ which is documented expected install location).
const PATH_RE =
  /(?:^|[\s(`])((?:\.\/)?(?:src|web|tests|fixtures|publish-stubs|\.github)\/(?:[\w./-]+)?|\b(?:README|BOUNDARY|LICENSE)\.md\b)(?=[\s).,;:`]|$)/gm

const referenced = new Map<string, string[]>() // path -> [doc names that mention it]
for (const doc of docs) {
  const text = stripFences(doc.text)
  for (const m of text.matchAll(PATH_RE)) {
    const p = m[1]!.replace(/^\.\//, '')
    const list = referenced.get(p) ?? []
    list.push(doc.name)
    referenced.set(p, list)
  }
}

const sortedRefs = [...referenced.keys()].sort()
for (const p of sortedRefs) {
  const abs = join(REPO_ROOT, p)
  if (existsSync(abs)) ok(`${p}  (referenced in ${[...new Set(referenced.get(p)!)].join(', ')})`)
  else fail(`MISSING: ${p}  (referenced in ${[...new Set(referenced.get(p)!)].join(', ')})`)
}
if (referenced.size === 0) console.log('  (no paths found — regex might be too tight)')

// ─────────────────────────────────────────────────────────────────────
// Check 2 — function names claimed in BOUNDARY glossary exist in src/
// ─────────────────────────────────────────────────────────────────────
heading('check 2 · BOUNDARY glossary function-name claims resolve in src/')

const boundaryText = docs.find((d) => d.name === 'BOUNDARY.md')?.text ?? ''
const CLAIMED_FNS = ['parseSvg', 'recognize', 'emitDsl', 'renderRecognized']

// Concatenate all src/*.ts(x) into one string (cheap; src/ is small).
const srcDir = join(REPO_ROOT, 'src')
const srcBlob = existsSync(srcDir)
  ? readdirSync(srcDir)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => readFileSync(join(srcDir, f), 'utf-8'))
      .join('\n────\n')
  : ''

for (const fn of CLAIMED_FNS) {
  if (!boundaryText.includes(fn)) continue
  if (new RegExp(`\\b${fn}\\b`).test(srcBlob)) ok(`${fn}  (found in src/)`)
  else fail(`MISSING in src/: ${fn}  (BOUNDARY glossary claims it as a decoder entry)`)
}

// ─────────────────────────────────────────────────────────────────────
// Check 3 — fixture list in BOUNDARY vs files on disk
// ─────────────────────────────────────────────────────────────────────
heading('check 3 · fixtures declared ⇔ on disk')

const fixturesDir = join(REPO_ROOT, 'fixtures')
const onDisk = existsSync(fixturesDir)
  ? readdirSync(fixturesDir)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''))
      .sort()
  : []

// Names we currently expect BOUNDARY to mention (alpha v0).
const declaredFixtures = ['congress', 'standard-model', 'tiger', 'firefox', 'inkscape']

for (const name of declaredFixtures) {
  const inDocs = boundaryText.includes(name)
  const present = onDisk.includes(name)
  if (inDocs && present) ok(`${name}.svg  (declared + on disk)`)
  else if (inDocs && !present) fail(`MISSING on disk: fixtures/${name}.svg  (claimed in BOUNDARY)`)
}

for (const file of onDisk) {
  if (!declaredFixtures.includes(file))
    fail(`UNDECLARED on disk: fixtures/${file}.svg  (add to BOUNDARY fixture list?)`)
}
if (onDisk.length === 0) console.log('  (no fixtures/*.svg on disk — skipped)')

// ─────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────
console.log()
if (failed > 0) {
  console.error(`${failed} anti-rot check(s) failed`)
  process.exit(1)
} else {
  console.log('all anti-rot checks passed')
}
