/**
 * Decoder validation against the 5 fixture SVGs.
 *
 * These tests assert the "thesis-validating" properties — not pixel
 * fidelity. The whole project bet is that semantic extraction (labels,
 * text, doc metadata) is enough for AI reasoning. Each test pins the
 * structural signal each fixture is supposed to carry, so we'll notice
 * if a decoder change regresses it.
 */

import { expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

import { emitDsl, recognize, type RecognizedPrim } from '../src/index'

const fx = (name: string) =>
  readFileSync(join(import.meta.dir, '..', 'fixtures', name), 'utf-8')

test('congress · 435 district id labels + style dedup', () => {
  const rec = recognize(fx('congress.svg'))
  expect(rec.primitives.length).toBeGreaterThan(400)
  // 436 paths share 2 distinct inline styles → dedup
  expect(rec.styles.size).toBe(2)
  const labeled = rec.primitives.filter(
    (p: RecognizedPrim) => 'label' in p && p.label,
  ).length
  expect(labeled).toBeGreaterThan(400)
  // First few districts should follow the STATE-NN naming convention
  const al = rec.primitives.find(
    (p: RecognizedPrim) => 'label' in p && p.label === 'AL-01',
  )
  expect(al).toBeDefined()
})

test('standard-model · text content + doc semantics', () => {
  const rec = recognize(fx('standard-model.svg'))
  const texts = rec.primitives.filter((p) => p.kind === 'text')
  expect(texts.length).toBeGreaterThan(100)
  expect(rec.doc.titles.length).toBe(1)
  expect(rec.doc.titles[0]).toContain('Standard Model')
  expect(rec.doc.descs.length).toBeGreaterThan(20)
  // Spot-check that particle-physics ontology made it through
  const descBlob = rec.doc.descs.join(' ')
  expect(descBlob).toContain('Forces')
  expect(descBlob).toContain('Fermions')
  expect(descBlob).toContain('Bosons')
  expect(descBlob).toContain('Higgs')
})

test('tiger · path parser still produces output even with empty styles', () => {
  const rec = recognize(fx('tiger.svg'))
  expect(rec.primitives.length).toBeGreaterThan(200)
  // Tiger keeps styles on parent <g> we don't yet inherit from — most
  // recognized styles are empty {}.  Documented limitation, not a bug.
  expect(rec.styles.size).toBeGreaterThanOrEqual(1)
})

test('firefox · gradient defs leave urls as-is (no resolve)', () => {
  const rec = recognize(fx('firefox.svg'))
  // 12 paths, each with `fill="url(#…)"` — captured verbatim as the
  // fill value. We do NOT attempt to resolve the gradient; that's
  // explicitly out-of-scope for v0.
  expect(rec.primitives.length).toBeGreaterThanOrEqual(10)
  const urlFills = [...rec.styles.values()].filter(
    (s) => typeof s.fill === 'string' && s.fill.startsWith('url('),
  ).length
  expect(urlFills).toBeGreaterThan(0)
})

test('emitDsl includes doc-semantics header when present', () => {
  const rec = recognize(fx('standard-model.svg'))
  const dsl = emitDsl(rec)
  expect(dsl).toContain('document semantics')
  expect(dsl).toContain('Standard Model of Elementary Particles')
  expect(dsl).toContain('Fermions')
})
