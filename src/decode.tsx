/**
 * geometry/decode — the inverse pipeline · SVG → DSL.
 *
 * Scope of this prototype:
 *   - parses raw SVG strings of the form `<svg viewBox="0 0 N N">…</svg>`
 *     where children are flat <circle>, <rect>, <ellipse>, <polygon>, <path>
 *     (no nested <g>, no <use>, no transform attrs — kept simple for demo).
 *   - recognizes: same-radius single circles · concentric circle groups ·
 *     grids of uniform-size rects · circular arcs encoded as
 *     `M … A r r 0 large sweep …` · regular star polygons.
 *   - emits DSL TypeScript-style source describing the structure.
 *
 * Not implemented (would belong here in Phase 2+):
 *   - general path parsing (cubic/quad bezier, polyline)
 *   - rotated / skewed shapes (assume axis-aligned)
 *   - rect → grid recognition under non-uniform cell sizes
 *   - boolean-op recovery
 *   - text recovery
 */

/* ─── Raw parse layer ──────────────────────────────────────────────────── */

/** Common semantic-label slots carried alongside geometry. Captured from
 *  the source SVG (`id="…"`, `aria-label="…"`). For Goal B (intent
 *  recovery), these are higher-density signal than geometry — a region
 *  labelled "AL-01" tells an LLM "Alabama district 01" before it parses
 *  a single bezier. Phase 0 captures + emits them; downstream LLM
 *  reasoning is the actual test of value. */
export type Semantics = { label?: string; ariaLabel?: string }

/** Text-specific style fields. fill/stroke continue to come from RawStyle;
 *  font / size / weight / anchor live here. */
export type TextStyle = {
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  textAnchor?: 'start' | 'middle' | 'end'
}

export type RawShape =
  | ({ kind: 'circle'; cx: number; cy: number; r: number; style: RawStyle } & Semantics)
  | ({ kind: 'rect'; x: number; y: number; w: number; h: number; style: RawStyle } & Semantics)
  | ({
      kind: 'ellipse'
      cx: number
      cy: number
      rx: number
      ry: number
      style: RawStyle
    } & Semantics)
  | ({ kind: 'polygon'; points: Array<[number, number]>; style: RawStyle } & Semantics)
  | ({ kind: 'path'; d: string; style: RawStyle } & Semantics)
  | ({
      kind: 'text'
      x: number
      y: number
      content: string
      textStyle: TextStyle
      style: RawStyle
    } & Semantics)

import { applyTheme, type Theme, type Tokenable } from './theme'

export type RawStyle = {
  fill?: string
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
  strokeOpacity?: number
  opacity?: number
}

/** RawStyle with each field allowed to be a token reference. Concrete
 *  RawStyle is a subtype (every value satisfies Tokenable<T>). */
export type RawStyleTokenable = {
  fill?: Tokenable<string>
  stroke?: Tokenable<string>
  strokeWidth?: Tokenable<number>
  fillOpacity?: Tokenable<number>
  strokeOpacity?: Tokenable<number>
  opacity?: Tokenable<number>
}

const attr = (s: string, name: string): string => {
  // `\b` is critical: without it, attr(tag, 'd') matches the trailing `d=` of
  // `id="…"`, swallowing the id value instead of the real `d` attribute.
  // Bit me hard on the Wikimedia SVG — every path's `d` came back as "AL-01"
  // (the id), so render was empty. Always anchor at a word boundary.
  const m = s.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))
  return m ? m[1] : ''
}
const attrNum = (s: string, name: string, fallback = 0): number => {
  const v = attr(s, name)
  return v === '' ? fallback : parseFloat(v)
}
const attrOpt = (s: string, name: string): string | undefined => {
  const v = attr(s, name)
  return v === '' ? undefined : v
}
const attrNumOpt = (s: string, name: string): number | undefined => {
  const v = attr(s, name)
  return v === '' ? undefined : parseFloat(v)
}

/** Parse style from BOTH individual attrs (fill="…") AND the CSS-style
 *  `style="fill:…;stroke:…;"` shorthand. Inkscape and many other exporters
 *  use the latter; without parsing it we lose 100% of style info on real-
 *  world files. Individual attrs take precedence when both are present. */
const parseStyle = (tag: string): RawStyle => {
  const out: RawStyle = {}
  // First: CSS-style 'style="…"'
  const styleStr = attr(tag, 'style')
  if (styleStr) {
    for (const decl of styleStr.split(';')) {
      const [k, v] = decl.split(':').map((s) => s.trim())
      if (!k || v === undefined) continue
      switch (k) {
        case 'fill':
          out.fill = v
          break
        case 'stroke':
          out.stroke = v
          break
        case 'stroke-width':
          out.strokeWidth = parseFloat(v)
          break
        case 'fill-opacity':
          out.fillOpacity = parseFloat(v)
          break
        case 'stroke-opacity':
          out.strokeOpacity = parseFloat(v)
          break
        case 'opacity':
          out.opacity = parseFloat(v)
          break
      }
    }
  }
  // Then: individual attrs override
  const fa = attrOpt(tag, 'fill')
  if (fa !== undefined) out.fill = fa
  const sa = attrOpt(tag, 'stroke')
  if (sa !== undefined) out.stroke = sa
  const sw = attrNumOpt(tag, 'stroke-width')
  if (sw !== undefined) out.strokeWidth = sw
  const fo = attrNumOpt(tag, 'fill-opacity')
  if (fo !== undefined) out.fillOpacity = fo
  const so = attrNumOpt(tag, 'stroke-opacity')
  if (so !== undefined) out.strokeOpacity = so
  const op = attrNumOpt(tag, 'opacity')
  if (op !== undefined) out.opacity = op
  return out
}

export function parseSvg(svg: string): {
  viewW: number
  viewH: number
  shapes: RawShape[]
} {
  let viewW = 100
  let viewH = 100
  const vb = svg.match(/viewBox\s*=\s*"([^"]*)"/s)
  if (vb) {
    const parts = vb[1]
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
    if (parts.length === 4) {
      viewW = parts[2]
      viewH = parts[3]
    }
  } else {
    // Many exports (Inkscape included) omit viewBox and rely on width/height.
    const svgOpen = svg.match(/<svg[^>]*>/s)
    if (svgOpen) {
      const w = parseFloat(attr(svgOpen[0], 'width'))
      const h = parseFloat(attr(svgOpen[0], 'height'))
      if (Number.isFinite(w) && w > 0) viewW = w
      if (Number.isFinite(h) && h > 0) viewH = h
    }
  }
  // Every regex uses /s (dotall) so `[^>]` matches across line breaks —
  // path d attributes regularly span 5+ lines in real exporters.
  const parseSemantics = (tag: string): Semantics => {
    const out: Semantics = {}
    const id = attr(tag, 'id')
    if (id) out.label = id
    const aria = attr(tag, 'aria-label')
    if (aria) out.ariaLabel = aria
    return out
  }
  const shapes: RawShape[] = []
  for (const m of svg.matchAll(/<circle\s+([^>]*?)\s*\/?>/gs)) {
    shapes.push({
      kind: 'circle',
      cx: attrNum(m[1], 'cx'),
      cy: attrNum(m[1], 'cy'),
      r: attrNum(m[1], 'r'),
      style: parseStyle(m[1]),
      ...parseSemantics(m[1]),
    })
  }
  for (const m of svg.matchAll(/<rect\s+([^>]*?)\s*\/?>/gs)) {
    shapes.push({
      kind: 'rect',
      x: attrNum(m[1], 'x'),
      y: attrNum(m[1], 'y'),
      w: attrNum(m[1], 'width'),
      h: attrNum(m[1], 'height'),
      style: parseStyle(m[1]),
      ...parseSemantics(m[1]),
    })
  }
  for (const m of svg.matchAll(/<ellipse\s+([^>]*?)\s*\/?>/gs)) {
    shapes.push({
      kind: 'ellipse',
      cx: attrNum(m[1], 'cx'),
      cy: attrNum(m[1], 'cy'),
      rx: attrNum(m[1], 'rx'),
      ry: attrNum(m[1], 'ry'),
      style: parseStyle(m[1]),
      ...parseSemantics(m[1]),
    })
  }
  for (const m of svg.matchAll(/<polygon\s+([^>]*?)\s*\/?>/gs)) {
    const pts = (attr(m[1], 'points') || '')
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
    const points: Array<[number, number]> = []
    for (let i = 0; i < pts.length; i += 2) points.push([pts[i], pts[i + 1]])
    shapes.push({ kind: 'polygon', points, style: parseStyle(m[1]), ...parseSemantics(m[1]) })
  }
  for (const m of svg.matchAll(/<path\s+([^>]*?)\s*\/?>/gs)) {
    shapes.push({
      kind: 'path',
      d: attr(m[1], 'd'),
      style: parseStyle(m[1]),
      ...parseSemantics(m[1]),
    })
  }
  // <text> — opens with attrs, closes with </text>. Inner content can include
  // nested <tspan> elements (we strip those to plain text for v0 — multi-run
  // text with per-tspan styling is Phase 2). textPath is also Phase 2.
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gs)) {
    const tagAttrs = m[1]
    const inner = m[2]
    // Strip any nested elements to get the visible string. \s+ collapse keeps
    // whitespace from the source from polluting the captured text.
    const content = inner
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!content) continue
    shapes.push({
      kind: 'text',
      x: attrNum(tagAttrs, 'x'),
      y: attrNum(tagAttrs, 'y'),
      content,
      textStyle: parseTextStyle(tagAttrs),
      style: parseStyle(tagAttrs),
      ...parseSemantics(tagAttrs),
    })
  }
  return { viewW, viewH, shapes }
}

function parseTextStyle(tag: string): TextStyle {
  const out: TextStyle = {}
  const styleStr = attr(tag, 'style')
  if (styleStr) {
    for (const decl of styleStr.split(';')) {
      const [k, v] = decl.split(':').map((s) => s.trim())
      if (!k || v === undefined) continue
      switch (k) {
        case 'font-family':
          out.fontFamily = v
          break
        case 'font-size':
          out.fontSize = parseFloat(v)
          break
        case 'font-weight':
          out.fontWeight = isNaN(parseFloat(v)) ? v : parseFloat(v)
          break
        case 'text-anchor':
          out.textAnchor = v as TextStyle['textAnchor']
          break
      }
    }
  }
  const ff = attrOpt(tag, 'font-family')
  if (ff !== undefined) out.fontFamily = ff
  const fs = attrNumOpt(tag, 'font-size')
  if (fs !== undefined) out.fontSize = fs
  const fw = attrOpt(tag, 'font-weight')
  if (fw !== undefined) out.fontWeight = isNaN(parseFloat(fw)) ? fw : parseFloat(fw)
  const ta = attrOpt(tag, 'text-anchor')
  if (ta !== undefined) out.textAnchor = ta as TextStyle['textAnchor']
  return out
}

/* ─── Recognition layer ────────────────────────────────────────────────── */

/** Document-level semantic metadata captured from <title> / <desc> /
 *  <metadata> elements anywhere in the SVG. These are the SVG-standard
 *  semantic slots — under-utilized by tools but high-density when present.
 *  P1.2 captures them all into a single flat list; "which element they
 *  attach to" is dropped for v0. */
export type DocSemantics = {
  titles: string[]
  descs: string[]
  metadata: string[]
}

export type Recognized = {
  viewW: number
  viewH: number
  doc: DocSemantics
  primitives: RecognizedPrim[]
  groups: RecognizedGroup[]
  /** Deduplicated styles. Each primitive references one entry by name.
   *  Each field is Tokenable — concrete values OR TokenRefs. The dedup
   *  table can be post-processed to wrap values in tokens (for theming).
   *  recognize() produces concrete values by default; downstream code
   *  may swap them for tokens to enable theme switching. */
  styles: Map<string, RawStyleTokenable>
  /** SVG → DSL compression diagnostics: input length in bytes, estimated
   *  emitted DSL length in bytes, ratio. Populated by `recognize`. */
  diagnostics: {
    inputBytes: number
    rawStyleBytes: number /* total inline style characters in input */
    styleClasses: number /* distinct style tokens after dedup */
  }
}

/** Each primitive carries:
 *   - `id: number`  — internal counter (cross-reference key)
 *   - `styleRef: string`  — into Recognized.styles dedup table
 *   - `label?: string`  — semantic name from SVG `id="…"` (the high-density
 *      LLM signal — "AL-01" tells an LLM "Alabama district 01" before any
 *      geometry is parsed)
 *   - `ariaLabel?: string` — accessibility label, similarly semantic */
export type RecognizedPrim =
  | {
      kind: 'circle'
      r: number
      at: Pt
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }
  | {
      kind: 'rect'
      w: number
      h: number
      at: Pt
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }
  | {
      kind: 'ellipse'
      rx: number
      ry: number
      at: Pt
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }
  | {
      kind: 'star'
      r: number
      innerRatio: number
      points: number
      at: Pt
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }
  | {
      kind: 'arc'
      r: number
      at: Pt
      fromDeg: number
      toDeg: number
      sweep: 'ccw' | 'cw'
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }
  | { kind: 'path'; d: string; styleRef: string; id: number; label?: string; ariaLabel?: string }
  | {
      kind: 'text'
      content: string
      at: Pt
      textStyle: TextStyle
      styleRef: string
      id: number
      label?: string
      ariaLabel?: string
    }

type Pt = { x: number; y: number }

export type RecognizedGroup =
  | { kind: 'concentric'; members: number[] /* circle ids, largest first */ }
  | {
      kind: 'grid'
      members: number[]
      cols: number
      rows: number
      cellW: number
      cellH: number
      gapX: number
      gapY: number
      container?: number /* primitive id that contains the grid */
    }

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const variance = (xs: number[]) => {
  const m = mean(xs)
  return mean(xs.map((x) => (x - m) ** 2))
}
const round = (x: number, p = 2) => Math.round(x * 10 ** p) / 10 ** p

/** Style dedup: build (or reuse) a named token for each distinct
 *  RawStyle. JSON.stringify on the canonicalized style is the key. */
function styleKey(s: RawStyle): string {
  // Canonicalize key order so logically-equal styles compare equal.
  const keys: Array<keyof RawStyle> = [
    'fill',
    'stroke',
    'strokeWidth',
    'fillOpacity',
    'strokeOpacity',
    'opacity',
  ]
  const obj: Record<string, unknown> = {}
  for (const k of keys) if (s[k] !== undefined) obj[k] = s[k]
  return JSON.stringify(obj)
}

export function recognize(svg: string): Recognized {
  const { viewW, viewH, shapes } = parseSvg(svg)
  const ox = viewW / 2
  const oy = viewH / 2

  // Style table — build as we go. Keys: stable JSON string; values: short refs.
  const styles = new Map<string, RawStyle>()
  const styleByKey = new Map<string, string>() // canonical JSON → refName
  let styleCounter = 0
  const refFor = (st: RawStyle): string => {
    const k = styleKey(st)
    const existing = styleByKey.get(k)
    if (existing) return existing
    const name = `s${++styleCounter}`
    styleByKey.set(k, name)
    styles.set(name, st)
    return name
  }

  let idCounter = 0
  const nextId = () => idCounter++
  const primitives: RecognizedPrim[] = []

  for (const s of shapes) {
    const styleRef = refFor(s.style)
    const sem = { label: s.label, ariaLabel: s.ariaLabel }
    if (s.kind === 'circle') {
      primitives.push({
        kind: 'circle',
        r: round(s.r),
        at: { x: round(s.cx - ox), y: round(oy - s.cy) },
        styleRef,
        id: nextId(),
        ...sem,
      })
    } else if (s.kind === 'rect') {
      primitives.push({
        kind: 'rect',
        w: round(s.w),
        h: round(s.h),
        at: { x: round(s.x + s.w / 2 - ox), y: round(oy - (s.y + s.h / 2)) },
        styleRef,
        id: nextId(),
        ...sem,
      })
    } else if (s.kind === 'ellipse') {
      primitives.push({
        kind: 'ellipse',
        rx: round(s.rx),
        ry: round(s.ry),
        at: { x: round(s.cx - ox), y: round(oy - s.cy) },
        styleRef,
        id: nextId(),
        ...sem,
      })
    } else if (s.kind === 'polygon') {
      const star = tryRecognizeStar(s.points)
      if (star) {
        primitives.push({
          ...star,
          at: { x: round(star.at.x - ox), y: round(oy - star.at.y) },
          styleRef,
          id: nextId(),
          ...sem,
        })
      } else {
        primitives.push({
          kind: 'path',
          d: 'polygon: ' + s.points.map((p) => p.join(',')).join(' '),
          styleRef,
          id: nextId(),
          ...sem,
        })
      }
    } else if (s.kind === 'path') {
      const arc = tryRecognizeArc(s.d, ox, oy)
      if (arc) {
        primitives.push({ ...arc, styleRef, id: nextId(), ...sem })
      } else {
        primitives.push({ kind: 'path', d: s.d, styleRef, id: nextId(), ...sem })
      }
    } else if (s.kind === 'text') {
      primitives.push({
        kind: 'text',
        content: s.content,
        at: { x: round(s.x - ox), y: round(oy - s.y) },
        textStyle: s.textStyle,
        styleRef,
        id: nextId(),
        ...sem,
      })
    }
  }

  /* Group detection */
  const groups: RecognizedGroup[] = []

  // concentric circle groups
  const circleIds = primitives.flatMap((p) => (p.kind === 'circle' ? [p.id] : []))
  const cgroups: number[][] = []
  for (const id of circleIds) {
    const c = primitives[id] as RecognizedPrim & { kind: 'circle' }
    const found = cgroups.find((g) => {
      const head = primitives[g[0]] as RecognizedPrim & { kind: 'circle' }
      return Math.abs(head.at.x - c.at.x) < 1 && Math.abs(head.at.y - c.at.y) < 1
    })
    if (found) found.push(id)
    else cgroups.push([id])
  }
  for (const g of cgroups) {
    if (g.length > 1) {
      g.sort((a, b) => (primitives[b] as any).r - (primitives[a] as any).r)
      groups.push({ kind: 'concentric', members: g })
    }
  }

  // Grid of uniform rects
  const rectIds = primitives.flatMap((p) => (p.kind === 'rect' ? [p.id] : []))
  if (rectIds.length >= 4) {
    const rects = rectIds.map((id) => primitives[id] as RecognizedPrim & { kind: 'rect' })
    const widths = unique(rects.map((r) => r.w))
    const heights = unique(rects.map((r) => r.h))
    if (widths.length === 1 && heights.length === 1) {
      const xs = unique(rects.map((r) => r.at.x)).sort((a, b) => a - b)
      const ys = unique(rects.map((r) => r.at.y)).sort((a, b) => b - a)
      if (xs.length * ys.length === rects.length) {
        const cellW = widths[0]
        const cellH = heights[0]
        const gapX = xs.length > 1 ? round(Math.abs(xs[1] - xs[0]) - cellW) : 0
        const gapY = ys.length > 1 ? round(Math.abs(ys[0] - ys[1]) - cellH) : 0
        // Find a container: smallest concentric inner circle that fits the grid
        const cornerR = Math.max(
          ...rects.map((r) => Math.hypot(Math.abs(r.at.x) + r.w / 2, Math.abs(r.at.y) + r.h / 2))
        )
        let containerId: number | undefined
        for (const cg of cgroups) {
          if (cg.length > 1) {
            const innermost = primitives[cg[cg.length - 1]] as RecognizedPrim & { kind: 'circle' }
            if (innermost.r >= cornerR) {
              containerId = innermost.id
              break
            }
          }
        }
        groups.push({
          kind: 'grid',
          members: rectIds,
          cols: xs.length,
          rows: ys.length,
          cellW,
          cellH,
          gapX,
          gapY,
          container: containerId,
        })
      }
    }
  }

  // Diagnostics for the optimization pitch: how much input was redundant?
  const inputBytes = new Blob([svg]).size
  const rawStyleBytes = [...svg.matchAll(/style\s*=\s*"([^"]*)"/g)].reduce(
    (acc, m) => acc + m[1].length,
    0
  )

  // P1.2 — document-level semantic metadata. Capture every <title>, <desc>,
  // <metadata> element regardless of nesting. We lose "which element does
  // this annotate" info for v0 but capture the full set of human-written
  // intent strings. The desc inside an inner <g> ("Forces" inside the bosons
  // group) is collected alongside the document-level one.
  const stripInner = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const titles: string[] = []
  for (const m of svg.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/g)) {
    const t = stripInner(m[1])
    if (t) titles.push(t)
  }
  const descs: string[] = []
  for (const m of svg.matchAll(/<desc\b[^>]*>([\s\S]*?)<\/desc>/g)) {
    const t = stripInner(m[1])
    if (t) descs.push(t)
  }
  const metadata: string[] = []
  for (const m of svg.matchAll(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/g)) {
    // metadata often holds RDF; strip tags for a human-readable text gist
    const t = stripInner(m[1])
    if (t) metadata.push(t)
  }

  return {
    viewW,
    viewH,
    doc: { titles, descs, metadata },
    primitives,
    groups,
    styles,
    diagnostics: {
      inputBytes,
      rawStyleBytes,
      styleClasses: styles.size,
    },
  }
}

function tryRecognizeStar(
  points: Array<[number, number]>
): { kind: 'star'; r: number; innerRatio: number; points: number; at: Pt } | null {
  const n = points.length
  if (n < 6 || n % 2 !== 0) return null
  const cx = points.reduce((s, p) => s + p[0], 0) / n
  const cy = points.reduce((s, p) => s + p[1], 0) / n
  const dists = points.map(([x, y]) => Math.hypot(x - cx, y - cy))
  const evenDists = dists.filter((_, i) => i % 2 === 0)
  const oddDists = dists.filter((_, i) => i % 2 === 1)
  const me = mean(evenDists)
  const mo = mean(oddDists)
  // Both subgroups must be tight; means must differ enough to read as star.
  if (variance(evenDists) > 1 || variance(oddDists) > 1) return null
  if (Math.abs(me - mo) < 0.5) return null
  const r = Math.max(me, mo)
  const innerRatio = Math.min(me, mo) / r
  return {
    kind: 'star',
    r: round(r),
    innerRatio: round(innerRatio, 3),
    points: n / 2,
    at: { x: cx, y: cy },
  }
}

function tryRecognizeArc(
  d: string,
  ox: number,
  oy: number
): {
  kind: 'arc'
  r: number
  at: Pt
  fromDeg: number
  toDeg: number
  sweep: 'ccw' | 'cw'
} | null {
  const m = d
    .trim()
    .match(
      /^M\s+([\d.eE+-]+)[\s,]+([\d.eE+-]+)\s+A\s+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+[\d.eE+-]+[\s,]+([01])[\s,]+([01])[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)\s*$/
    )
  if (!m) return null
  const x1 = parseFloat(m[1])
  const y1 = parseFloat(m[2])
  const rx = parseFloat(m[3])
  const ry = parseFloat(m[4])
  const large = m[5] === '1'
  const sweep = m[6] === '1'
  const x2 = parseFloat(m[7])
  const y2 = parseFloat(m[8])
  if (Math.abs(rx - ry) > 0.6) return null
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const chord = Math.hypot(dx, dy)
  if (chord > 2 * rx + 0.5) return null
  const h = Math.sqrt(Math.max(0, rx * rx - (chord / 2) ** 2))
  const nx = -dy / chord
  const ny = dx / chord
  // SVG arc center: the perpendicular-bisector side is chosen by fA == fS.
  // Tested empirically against the demo arc: for fA=0 fS=0 we need sign=-1
  // (places center BELOW chord, so the arc bulges UP — matches the rendered
  // input). The naive `fA == fS ? +1 : -1` rule gets it backwards.
  const sign = large === sweep ? -1 : 1
  const cx_svg = mx + sign * nx * h
  const cy_svg = my + sign * ny * h
  // Math y-up center
  const cx_math = cx_svg - ox
  const cy_math = oy - cy_svg
  const a1 = Math.atan2(oy - y1 - cy_math, x1 - ox - cx_math) * (180 / Math.PI)
  const a2 = Math.atan2(oy - y2 - cy_math, x2 - ox - cx_math) * (180 / Math.PI)
  return {
    kind: 'arc',
    r: round(rx),
    at: { x: round(cx_math), y: round(cy_math) },
    fromDeg: round(a1),
    toDeg: round(a2),
    sweep: sweep ? 'cw' : 'ccw',
  }
}

function unique(xs: number[]): number[] {
  return [...new Set(xs)]
}

/* ─── Emit layer ───────────────────────────────────────────────────────── */

function emitStyle(s: RawStyleTokenable): string {
  const parts: string[] = []
  const emit = (v: Tokenable<string | number>): string =>
    typeof v === 'object' && v !== null && '__isToken' in v
      ? `token('${(v as { name: string }).name}')`
      : typeof v === 'string'
        ? `'${v}'`
        : String(v)
  if (s.fill !== undefined) parts.push(`fill: ${emit(s.fill)}`)
  if (s.stroke !== undefined) parts.push(`stroke: ${emit(s.stroke)}`)
  if (s.strokeWidth !== undefined) parts.push(`strokeWidth: ${emit(s.strokeWidth)}`)
  if (s.fillOpacity !== undefined) parts.push(`fillOpacity: ${emit(s.fillOpacity)}`)
  if (s.strokeOpacity !== undefined) parts.push(`strokeOpacity: ${emit(s.strokeOpacity)}`)
  if (s.opacity !== undefined) parts.push(`opacity: ${emit(s.opacity)}`)
  return `{ ${parts.join(', ')} }`
}

export function emitDsl(rec: Recognized): string {
  const lines: string[] = []

  // 0. Document semantics first — they're the highest-density signal for
  //    an LLM reading the spec. Title + desc + metadata gets emitted as
  //    header comments. The whole document's intent can often be inferred
  //    from these alone, before any geometry is parsed.
  const { titles, descs, metadata } = rec.doc
  if (titles.length || descs.length || metadata.length) {
    lines.push(`// ══ document semantics ══`)
    for (const t of titles) lines.push(`// title:  ${t}`)
    for (const d of descs) lines.push(`// desc:   ${d}`)
    for (const m of metadata) {
      // metadata often holds long RDF text — truncate for readability
      const preview = m.length > 240 ? m.slice(0, 240) + '…' : m
      lines.push(`// meta:   ${preview}`)
    }
    lines.push('')
  }

  lines.push(`const f = new Frame({ x: ${round(rec.viewW / 2)}, y: ${round(rec.viewH / 2)} },`)
  lines.push(`                   { w: ${round(rec.viewW)}, h: ${round(rec.viewH)} })`)
  lines.push('')

  // 1. Style table — emit each distinct style once. The whole optimization
  //    story turns on this: a 25KB stream of `style="…"` redundancy becomes
  //    N short consts + N short references.
  if (rec.styles.size > 0) {
    lines.push(`// ── styles · ${rec.styles.size} distinct of ${rec.primitives.length} usages ──`)
    for (const [name, s] of rec.styles) {
      lines.push(`const ${name} = ${emitStyle(s)}`)
    }
    lines.push('')
  }

  // Track which primitives are consumed by a group, so we don't emit them twice.
  const consumed = new Set<number>()
  const varName = new Map<number, string>()
  const styled = (ref: string) => (ref ? `.style(${ref})` : '')
  const atStr = (p: Pt) => (p.x === 0 && p.y === 0 ? '' : `, at: { x: ${p.x}, y: ${p.y} }`)

  // 2. Concentric groups
  for (const g of rec.groups) {
    if (g.kind === 'concentric') {
      const first = rec.primitives[g.members[0]] as RecognizedPrim & { kind: 'circle' }
      const baseName = `ring${g.members[0]}`
      lines.push(`// Recognized: ${g.members.length} concentric circles`)
      lines.push(`const ${baseName} = f.circle({ r: ${first.r} })${styled(first.styleRef)}`)
      varName.set(first.id, baseName)
      consumed.add(first.id)
      let prevName = baseName
      let prevR = first.r
      for (let i = 1; i < g.members.length; i++) {
        const c = rec.primitives[g.members[i]] as RecognizedPrim & { kind: 'circle' }
        const name = `ring${c.id}`
        const inset = round(prevR - c.r)
        lines.push(`const ${name} = ${prevName}.inset(${inset})${styled(c.styleRef)}`)
        varName.set(c.id, name)
        consumed.add(c.id)
        prevName = name
        prevR = c.r
      }
      lines.push('')
    }
  }

  // 3. Grids
  for (const g of rec.groups) {
    if (g.kind === 'grid') {
      const name = `cells${g.members[0]}`
      if (g.container !== undefined) {
        const containerName = varName.get(g.container) ?? `prim${g.container}`
        lines.push(
          `// Recognized: ${g.cols}×${g.rows} grid of ${g.cellW}×${g.cellH} rects inside ${containerName}`
        )
        lines.push(`const ${name} = f.gridInside(${containerName}, {`)
        lines.push(`  cols: ${g.cols}, rows: ${g.rows},`)
        lines.push(`  gap: [${g.gapX}, ${g.gapY}],`)
        const cont = rec.primitives[g.container] as RecognizedPrim & { kind: 'circle' }
        const totalW = g.cols * g.cellW + (g.cols - 1) * g.gapX
        const totalH = g.rows * g.cellH + (g.rows - 1) * g.gapY
        const cornerR = Math.hypot(totalW / 2, totalH / 2)
        const pad = round(cont.r - cornerR)
        if (pad > 0.5) lines.push(`  padding: ${pad},`)
        lines.push(`})`)
      } else {
        lines.push(`// Recognized: ${g.cols}×${g.rows} grid of ${g.cellW}×${g.cellH} rects`)
        lines.push(`const ${name} = f.gridFill({`)
        lines.push(
          `  bounds: [${g.cols * g.cellW + (g.cols - 1) * g.gapX}, ${g.rows * g.cellH + (g.rows - 1) * g.gapY}],`
        )
        lines.push(`  cols: ${g.cols}, rows: ${g.rows},`)
        lines.push(`  gap: [${g.gapX}, ${g.gapY}],`)
        lines.push(`})`)
      }
      for (const id of g.members) consumed.add(id)
      lines.push('')
    }
  }

  // 4. Standalone primitives
  // Each line gets `// label="…"` annotation if the source SVG had id / aria-
  // label set — high-density LLM signal we deliberately surface above the
  // geometry. This is the experiment 1 wager: that semantic labels matter
  // more than per-byte path fidelity for downstream reasoning.
  const sanitize = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[0-9]/, '_$&')
  const nameOf = (p: RecognizedPrim, fallback: string) => (p.label ? sanitize(p.label) : fallback)
  const annotate = (p: RecognizedPrim): string => {
    const parts: string[] = []
    if (p.label) parts.push(`label='${p.label}'`)
    if (p.ariaLabel) parts.push(`aria='${p.ariaLabel}'`)
    return parts.length ? `  // ${parts.join(', ')}` : ''
  }
  const leftovers = rec.primitives.filter((p) => !consumed.has(p.id))
  if (leftovers.length) {
    const labeledCount = leftovers.filter((p) => p.label || p.ariaLabel).length
    lines.push(
      `// ── shapes · ${leftovers.length} primitives` +
        (labeledCount ? ` · ${labeledCount} with semantic labels` : '') +
        ` ──`
    )
    for (const p of leftovers) {
      const ann = annotate(p)
      if (p.kind === 'circle') {
        lines.push(
          `const ${nameOf(p, `c${p.id}`)} = f.circle({ r: ${p.r}${atStr(p.at)} })${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'rect') {
        lines.push(
          `const ${nameOf(p, `r${p.id}`)} = f.rect({ size: [${p.w}, ${p.h}]${atStr(p.at)} })${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'ellipse') {
        lines.push(
          `const ${nameOf(p, `e${p.id}`)} = f.ellipse({ rx: ${p.rx}, ry: ${p.ry}${atStr(p.at)} })${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'star') {
        lines.push(
          `const ${nameOf(p, `s${p.id}`)} = f.star({ r: ${p.r}, points: ${p.points}, innerRatio: ${p.innerRatio}${atStr(p.at)} })${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'arc') {
        const center = (p.fromDeg + p.toDeg) / 2
        const span = Math.abs(p.toDeg - p.fromDeg)
        lines.push(
          `const ${nameOf(p, `a${p.id}`)} = f.circle({ r: ${p.r}${atStr(p.at)} }).arcCentered({ at: ${round(center)}, span: ${round(span)} })${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'path') {
        const dPreview = p.d.length > 60 ? p.d.slice(0, 60) + '…' : p.d
        lines.push(
          `const ${nameOf(p, `p${p.id}`)} = f.opaquePath(\`${dPreview}\`)${styled(p.styleRef)}${ann}`
        )
      } else if (p.kind === 'text') {
        const ts = p.textStyle
        const tsParts: string[] = []
        if (ts.fontSize !== undefined) tsParts.push(`size: ${ts.fontSize}`)
        if (ts.fontFamily) tsParts.push(`family: '${ts.fontFamily}'`)
        if (ts.fontWeight !== undefined) tsParts.push(`weight: ${JSON.stringify(ts.fontWeight)}`)
        if (ts.textAnchor) tsParts.push(`anchor: '${ts.textAnchor}'`)
        const tsStr = tsParts.length ? `, ${tsParts.join(', ')}` : ''
        const safe = p.content.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        lines.push(
          `const ${nameOf(p, `t${p.id}`)} = f.text({ content: '${safe}'${atStr(p.at)}${tsStr} })${styled(p.styleRef)}${ann}`
        )
      }
    }
  }

  return lines.join('\n')
}

/** Estimated emitted DSL bytes — for showing the compression win without
 *  actually building the source string twice. Counts approximate per-shape
 *  cost + style-table cost. Used in the demo stats only. */
export function estimateEmitBytes(rec: Recognized): number {
  let bytes = 0
  for (const s of rec.styles.values()) bytes += emitStyle(s).length + 12 /* `const N = ` */
  for (const p of rec.primitives) {
    if (p.kind === 'path') bytes += Math.min(60, 'd' in p ? p.d.length : 0) + 30
    else bytes += 80 // typical short primitive line
  }
  return bytes
}

/* ─── Re-render: spec → SVG attrs (for visual comparison) ──────────────── */
/*
 * Used by the demo page to draw the *decoded* result side-by-side with
 * the input — proves the round-trip preserves visual semantics.
 */

import { type ReactElement } from 'react'

import { Frame } from './frame'

export function renderRecognized(rec: Recognized, theme: Theme = {}): ReactElement[] {
  // Non-square viewport — math origin at (viewW/2, viewH/2).
  const f = new Frame({ x: rec.viewW / 2, y: rec.viewH / 2 }, { w: rec.viewW, h: rec.viewH })
  const out: ReactElement[] = []

  // Resolve each style entry against the theme up-front. Concrete fields
  // pass through unchanged; TokenRef fields look up the theme (with
  // per-token fallback). Memoized per-call by Map: 436 shapes share 2
  // styles → 2 resolutions, not 436.
  const resolvedStyles = new Map<string, RawStyle>()
  for (const [ref, s] of rec.styles) {
    resolvedStyles.set(ref, applyTheme<RawStyle>(s, theme))
  }
  const svgStyle = (ref: string): RawStyle => resolvedStyles.get(ref) ?? {}

  for (const p of rec.primitives) {
    if (p.kind === 'circle') {
      const c = f.circle({ r: p.r, at: p.at })
      out.push(<circle key={`c-${p.id}`} {...c.toSvgAttrs()} {...svgStyle(p.styleRef)} />)
    } else if (p.kind === 'rect') {
      const r = f.rect({ size: [p.w, p.h], at: p.at })
      out.push(<rect key={`r-${p.id}`} {...r.toSvgAttrs()} {...svgStyle(p.styleRef)} />)
    } else if (p.kind === 'ellipse') {
      const e = f.ellipse({ rx: p.rx, ry: p.ry, at: p.at })
      out.push(<ellipse key={`e-${p.id}`} {...e.toSvgAttrs()} {...svgStyle(p.styleRef)} />)
    } else if (p.kind === 'star') {
      const poly = f.star({ r: p.r, points: p.points, innerRatio: p.innerRatio, at: p.at })
      out.push(<polygon key={`s-${p.id}`} points={poly.toSvgPoints()} {...svgStyle(p.styleRef)} />)
    } else if (p.kind === 'arc') {
      const a = f.circle({ r: p.r, at: p.at }).arcSpan({
        from: p.fromDeg,
        to: p.toDeg,
        sweep: p.sweep,
      })
      const s = svgStyle(p.styleRef)
      out.push(<path key={`a-${p.id}`} d={a.toSvgD()} {...s} fill={s.fill ?? 'none'} />)
    } else if (p.kind === 'path') {
      // Opaque path: render the d string verbatim in the SAME SVG coord
      // system as the input. The decoder didn't normalize geometry inside
      // the d string (no path-command parser yet) — but emitting it back
      // unchanged is faithful AND preserves whatever Inkscape-style
      // relative bezier soup the exporter wrote.
      if (!p.d.startsWith('polygon:')) {
        out.push(<path key={`p-${p.id}`} d={p.d} {...svgStyle(p.styleRef)} />)
      }
    } else if (p.kind === 'text') {
      const svgPt = f.toSvg(p.at)
      const ts = p.textStyle
      out.push(
        <text
          key={`t-${p.id}`}
          x={svgPt.x}
          y={svgPt.y}
          fontSize={ts.fontSize}
          fontFamily={ts.fontFamily}
          fontWeight={ts.fontWeight}
          textAnchor={ts.textAnchor}
          {...svgStyle(p.styleRef)}
        >
          {p.content}
        </text>
      )
    }
  }
  return out
}
