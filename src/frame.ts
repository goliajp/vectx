/**
 * Plane-geometry DSL — Phase 0 (Frame + Circle + Arc + Ellipse + Rect +
 * Polygon + Line).
 *
 * Conventions (deliberately NOT SVG's):
 *   - Coordinate system: y-up math frame. +x right, +y up. Origin (0, 0)
 *     sits at frame.originSvg in SVG-pixel space.
 *   - Angles: degrees, measured CCW from +x (math convention).
 *     0° = east, 90° = up, 180° = west, 270° = down.
 *   - Sweep direction: 'ccw' is the positive math direction (default).
 *
 * SVG semantics (y-down, sweep-flag, corner-anchored rects, etc.) are
 * confined to the compile layer in each shape's `toSvg*()` method.
 * Callers never see them.
 *
 * Phase 0 dogfood target: rewrite seals.tsx 02.3 GeomDiagram cards.
 * Success criterion: each form diagram renders identically to the
 * hand-fixed version, but the code (a) is shorter, (b) reads like
 * geometric description, and (c) makes the "smiley face" bug
 * structurally impossible — no hand-typed endpoints.
 */

export type Point = { x: number; y: number }

export type Style = {
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
}

const ORIGIN: Point = { x: 0, y: 0 }

/* ── Frame ───────────────────────────────────────────────────────── */

export class Frame {
  readonly originSvg: Point
  readonly viewSize: { w: number; h: number }

  constructor(originSvg: Point, viewSize: { w: number; h: number }) {
    this.originSvg = originSvg
    this.viewSize = viewSize
  }

  /** Square viewBox with math origin at its center. */
  static centered(size: number): Frame {
    return new Frame({ x: size / 2, y: size / 2 }, { w: size, h: size })
  }

  /** Convert a math-frame point to SVG-pixel coordinates (y-flip). */
  toSvg(p: Point): Point {
    return { x: this.originSvg.x + p.x, y: this.originSvg.y - p.y }
  }

  circle(opts: { r: number; at?: Point }): Circle {
    return new Circle(this, opts.r, opts.at ?? ORIGIN)
  }

  ellipse(opts: { rx: number; ry: number; at?: Point }): Ellipse {
    return new Ellipse(this, opts.rx, opts.ry, opts.at ?? ORIGIN)
  }

  rect(opts: { size: [number, number]; at?: Point }): Rect {
    return new Rect(this, opts.size[0], opts.size[1], opts.at ?? ORIGIN)
  }

  /** Regular N-gon: N vertices on a circle of radius r. `topAt` (default 90°)
   *  pins the first vertex to that math angle. */
  regularPolygon(opts: { r: number; sides: number; at?: Point; topAt?: number }): Polygon {
    const c = opts.at ?? ORIGIN
    const start = ((opts.topAt ?? 90) * Math.PI) / 180
    const step = (2 * Math.PI) / opts.sides
    const vertices: Point[] = []
    for (let i = 0; i < opts.sides; i++) {
      const a = start + i * step
      vertices.push({ x: c.x + opts.r * Math.cos(a), y: c.y + opts.r * Math.sin(a) })
    }
    return new Polygon(this, vertices)
  }

  /** N-pointed star: 2N vertices alternating outer radius `r` and inner radius
   *  `r * innerRatio`. Default ratio 0.382 (golden-ratio 5-point star). */
  star(opts: {
    r: number
    points: number
    innerRatio?: number
    at?: Point
    topAt?: number
  }): Polygon {
    const c = opts.at ?? ORIGIN
    const inner = opts.r * (opts.innerRatio ?? 0.382)
    const start = ((opts.topAt ?? 90) * Math.PI) / 180
    const step = Math.PI / opts.points
    const vertices: Point[] = []
    for (let i = 0; i < opts.points * 2; i++) {
      const a = start + i * step
      const rr = i % 2 === 0 ? opts.r : inner
      vertices.push({ x: c.x + rr * Math.cos(a), y: c.y + rr * Math.sin(a) })
    }
    return new Polygon(this, vertices)
  }

  line(opts: { from: Point; to: Point }): Line {
    return new Line(this, opts.from, opts.to)
  }

  /** Horizontal chord of length 2·`halfWidth` at math y = `y`. */
  hLine(opts: { y: number; halfWidth: number }): Line {
    return new Line(this, { x: -opts.halfWidth, y: opts.y }, { x: opts.halfWidth, y: opts.y })
  }

  /**
   * Symmetric grid of `cols × rows` cells with explicit cell size + gap.
   * Use this when you already know cell size. For "fill this bounded region
   * with N×M equally-spaced cells", use `gridFill()` instead — that's the
   * common case and removes the "padding ≠ gap" footgun.
   */
  grid(opts: {
    cols: number
    rows: number
    cellSize: [number, number]
    gap?: [number, number]
    at?: Point
  }): Rect[] {
    const [cellW, cellH] = opts.cellSize
    const [gapX, gapY] = opts.gap ?? [0, 0]
    const center = opts.at ?? ORIGIN
    const stepX = cellW + gapX
    const stepY = cellH + gapY
    const startX = center.x - ((opts.cols - 1) * stepX) / 2
    const startY = center.y + ((opts.rows - 1) * stepY) / 2 // y-up: top row = highest y
    const cells: Rect[] = []
    for (let r = 0; r < opts.rows; r++) {
      for (let c = 0; c < opts.cols; c++) {
        cells.push(
          new Rect(this, cellW, cellH, {
            x: startX + c * stepX,
            y: startY - r * stepY,
          })
        )
      }
    }
    return cells
  }

  /**
   * Fill a bounded region with a `cols × rows` grid of equally-spaced cells.
   * Cell dimensions are *derived* from bounds + gap + padding — not specified.
   * This makes "gap between cells == padding from the edge" the default,
   * so the "中间空、四周挤" footgun cannot occur.
   *
   * - `bounds`: [width, height] of the box to fill.
   * - `gap`: spacing between adjacent cells (default [0, 0]).
   * - `padding`: edge padding from bounds. Defaults to `gap` for equal
   *   spacing throughout. Override to make the grid float inside extra room.
   *
   * Example: `f.gridFill({ bounds: [92, 92], cols: 2, rows: 2, gap: [8, 8] })`
   * → cellW = (92 − 3·8) / 2 = 34, every neighbour AND every edge has 8px.
   */
  gridFill(opts: {
    bounds: [number, number]
    cols: number
    rows: number
    gap?: [number, number]
    padding?: [number, number]
    at?: Point
  }): Rect[] {
    const [boundsW, boundsH] = opts.bounds
    const [gapX, gapY] = opts.gap ?? [0, 0]
    const [padX, padY] = opts.padding ?? [gapX, gapY] // equal-spacing default
    const contentW = boundsW - 2 * padX - (opts.cols - 1) * gapX
    const contentH = boundsH - 2 * padY - (opts.rows - 1) * gapY
    return this.grid({
      cols: opts.cols,
      rows: opts.rows,
      cellSize: [contentW / opts.cols, contentH / opts.rows],
      gap: [gapX, gapY],
      at: opts.at,
    })
  }

  /**
   * Fit a `cols × rows` grid INSIDE a container shape (Circle / Ellipse / Rect).
   * Cells are auto-sized to inscribe into the shape; `padding` is the gap
   * between the grid's bounding box and the container boundary.
   *
   * - For a Circle, the bounding box is the inscribed square (side r·√2),
   *   shrunk by 2·padding.
   * - For an Ellipse, bounds = (rx·√2, ry·√2) minus padding.
   * - For a Rect, bounds = (rect.w − 2·padding, rect.h − 2·padding).
   *
   * Use case: `f.gridInside(innerRing, { cols: 2, rows: 3, gap: [2,2], padding: 4 })`
   * lays out cells inside a circular ring with explicit breathing room from
   * the ring edge — no need to compute r·√2 by hand.
   *
   * For circles especially, pair this with `<ClipInside shape={ring}>` as
   * a defense against rounding overshoot at the corners.
   */
  gridInside(
    container: Circle | Ellipse | Rect,
    opts: {
      cols: number
      rows: number
      gap?: [number, number]
      padding?: number
    }
  ): Rect[] {
    const pad = opts.padding ?? 0
    let bounds: [number, number]
    let center: Point
    if (container instanceof Circle) {
      // Aspect-aware inscription: bounds W:H = cols:rows so cells come out
      // ~square. For W = cols·k, H = rows·k inscribed in circle of effective
      // radius (R−pad): W² + H² = (2(R−pad))² → k = 2(R−pad)/√(cols² + rows²).
      const r = container.r - pad
      const k = (2 * r) / Math.sqrt(opts.cols * opts.cols + opts.rows * opts.rows)
      bounds = [opts.cols * k, opts.rows * k]
      center = container.center
    } else if (container instanceof Ellipse) {
      // Inscribed rect of aspect cols:rows in ellipse. Parametrize corner
      // as (rx·cos t, ry·sin t); aspect condition fixes tan t.
      const rx = container.rx - pad
      const ry = container.ry - pad
      const t = Math.atan2(opts.rows * rx, opts.cols * ry)
      bounds = [2 * rx * Math.cos(t), 2 * ry * Math.sin(t)]
      center = container.center
    } else {
      bounds = [container.w - 2 * pad, container.h - 2 * pad]
      center = container.center
    }
    return this.gridFill({
      bounds,
      cols: opts.cols,
      rows: opts.rows,
      gap: opts.gap,
      padding: [0, 0], // already accounted for via bounds
      at: center,
    })
  }
}

/* ── Circle ──────────────────────────────────────────────────────── */

export class Circle {
  readonly frame: Frame
  readonly r: number
  readonly center: Point

  constructor(frame: Frame, r: number, center: Point) {
    this.frame = frame
    this.r = r
    this.center = center
  }

  /**
   * Arc on this circle from `from` → `to` degrees.
   * - `sweep: 'ccw'` (default, math-positive): goes through increasing angle.
   * - `sweep: 'cw'`: goes through decreasing angle.
   * Endpoints derive from (center, r, angle), so concentricity is guaranteed
   * — SVG cannot re-center.
   */
  arcSpan(opts: { from: number; to: number; sweep?: 'ccw' | 'cw' }): Arc {
    return new Arc(this.frame, this.r, this.center, opts.from, opts.to, opts.sweep ?? 'ccw')
  }

  /** Convenience: arc centered on math angle `at`, total angular span `span`. */
  arcCentered(opts: { at: number; span: number; sweep?: 'ccw' | 'cw' }): Arc {
    const half = opts.span / 2
    return this.arcSpan({ from: opts.at - half, to: opts.at + half, sweep: opts.sweep })
  }

  /** Concentric smaller circle with radius shrunk by `amount`. Use to
   *  express "padding from the ring edge": `frame.inset(8)` gives an
   *  inner boundary 8 units inside the original ring, useful as an
   *  intersection target so content gets cut at the smaller radius and
   *  leaves visible breathing room from the visible stroke. */
  inset(amount: number): Circle {
    return new Circle(this.frame, this.r - amount, this.center)
  }

  toSvgAttrs(): { cx: number; cy: number; r: number } {
    const c = this.frame.toSvg(this.center)
    return { cx: c.x, cy: c.y, r: this.r }
  }
}

/* ── Arc ─────────────────────────────────────────────────────────── */

export class Arc {
  readonly frame: Frame
  readonly r: number
  readonly center: Point
  readonly fromDeg: number
  readonly toDeg: number
  readonly sweep: 'ccw' | 'cw'

  constructor(
    frame: Frame,
    r: number,
    center: Point,
    fromDeg: number,
    toDeg: number,
    sweep: 'ccw' | 'cw'
  ) {
    this.frame = frame
    this.r = r
    this.center = center
    this.fromDeg = fromDeg
    this.toDeg = toDeg
    this.sweep = sweep
  }

  toSvgD(): string {
    const a1 = (this.fromDeg * Math.PI) / 180
    const a2 = (this.toDeg * Math.PI) / 180
    const p1m: Point = {
      x: this.center.x + this.r * Math.cos(a1),
      y: this.center.y + this.r * Math.sin(a1),
    }
    const p2m: Point = {
      x: this.center.x + this.r * Math.cos(a2),
      y: this.center.y + this.r * Math.sin(a2),
    }
    const p1 = this.frame.toSvg(p1m)
    const p2 = this.frame.toSvg(p2m)
    let spanCcw = (((this.toDeg - this.fromDeg) % 360) + 360) % 360
    if (this.sweep === 'cw') spanCcw = 360 - spanCcw
    const largeArc = spanCcw > 180 ? 1 : 0
    // Math CCW = visually CCW. SVG sweep-flag 1 = visually CW (y-down inverts
    // the spec's "positive direction" relative to what we see). Hence:
    const svgSweep = this.sweep === 'ccw' ? 0 : 1
    return (
      `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}` +
      ` A ${this.r} ${this.r} 0 ${largeArc} ${svgSweep}` +
      ` ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`
    )
  }
}

/* ── Ellipse ─────────────────────────────────────────────────────── */

export class Ellipse {
  readonly frame: Frame
  readonly rx: number
  readonly ry: number
  readonly center: Point

  constructor(frame: Frame, rx: number, ry: number, center: Point) {
    this.frame = frame
    this.rx = rx
    this.ry = ry
    this.center = center
  }

  /** Concentric ellipse with both radii shrunk by `inset`. */
  concentric(inset: number): Ellipse {
    return new Ellipse(this.frame, this.rx - inset, this.ry - inset, this.center)
  }

  toSvgAttrs(): { cx: number; cy: number; rx: number; ry: number } {
    const c = this.frame.toSvg(this.center)
    return { cx: c.x, cy: c.y, rx: this.rx, ry: this.ry }
  }
}

/* ── Rect ────────────────────────────────────────────────────────── */

export class Rect {
  readonly frame: Frame
  readonly w: number
  readonly h: number
  readonly center: Point

  constructor(frame: Frame, w: number, h: number, center: Point) {
    this.frame = frame
    this.w = w
    this.h = h
    this.center = center
  }

  /** Concentric rect with `amount` removed from each side. */
  inset(amount: number): Rect {
    return new Rect(this.frame, this.w - 2 * amount, this.h - 2 * amount, this.center)
  }

  /** SVG <rect> uses top-left corner — compile y-flips the center and
   *  subtracts half-extents. */
  toSvgAttrs(): { x: number; y: number; width: number; height: number } {
    const c = this.frame.toSvg(this.center)
    return { x: c.x - this.w / 2, y: c.y - this.h / 2, width: this.w, height: this.h }
  }

  /**
   * Geometric intersection `Rect ∩ Circle`. Returns a Path representing the
   * region of this rect that lies inside the circle — corners that poke
   * outside get cut along the circle's arc.
   *
   * Phase 1.0 scope:
   * - Rect fully inside circle → returns the rect path.
   * - Rect fully outside circle → returns empty path.
   * - Mixed (any combination of 0–4 corners outside) → returns a closed
   *   path that walks rect edges where they're inside the circle and
   *   replaces outside segments with the circle's arc.
   *
   * NOT supported yet: rect entirely contains circle (returns rect, wrong);
   * disjoint rects (would need multi-component paths). Add when seals
   * actually hits those cases.
   */
  intersect(circle: Circle): Path {
    const cxR = this.center.x
    const cyR = this.center.y
    const hw = this.w / 2
    const hh = this.h / 2
    const cxC = circle.center.x
    const cyC = circle.center.y
    const r = circle.r
    // Corner order: BL → BR → TR → TL (math y-up). Walking this order
    // gives the correct fill direction once we flip y at SVG-emit time.
    const corners: Point[] = [
      { x: cxR - hw, y: cyR - hh },
      { x: cxR + hw, y: cyR - hh },
      { x: cxR + hw, y: cyR + hh },
      { x: cxR - hw, y: cyR + hh },
    ]
    const insideCircle = (p: Point) =>
      (p.x - cxC) * (p.x - cxC) + (p.y - cyC) * (p.y - cyC) <= r * r + 1e-9
    const inside = corners.map(insideCircle)

    // Trivial: all inside.
    if (inside.every((b) => b)) {
      return this.toRectPath()
    }
    // Trivial: all outside AND no edge crosses the circle.
    // (Approximation: if all corners outside, assume rect doesn't contain
    // the circle. For our seal use case this holds.)
    if (inside.every((b) => !b)) {
      // Test: does any rect edge cross the circle? If not, empty.
      let anyCross = false
      for (let i = 0; i < 4 && !anyCross; i++) {
        const ts = lineCircleParams(corners[i], corners[(i + 1) % 4], cxC, cyC, r)
        if (ts.length > 0) anyCross = true
      }
      if (!anyCross) return new Path(this.frame, '')
      // Edge case (rect crosses circle in a strip but no corner inside) —
      // skipped for now; falls through to walk algorithm which may emit
      // a partial/incorrect path. Address when seals needs it.
    }

    // Mixed case: walk edges. Critical: ROTATE the corner order to start
    // at an inside corner. Without this, the path starts at an entry point
    // and ends at an exit point (or vice versa); the implicit `Z` closes
    // them with a straight line instead of the required circle arc, leaving
    // 3 of 4 corner cells uncut. Starting at an inside corner guarantees
    // the walk's last edge is `outside → inside` (an enter transition),
    // which emits the closing arc inside the loop body.
    const startOffset = inside.indexOf(true)
    // startOffset < 0 → all corners outside; falls through to the loop and
    // produces no path content (handled at top above). Defensive only here.
    const startIdx = startOffset >= 0 ? startOffset : 0

    const segs: string[] = []
    let moved = false
    const move = (p: { x: number; y: number }) => {
      const s = this.frame.toSvg(p)
      segs.push(`M ${s.x.toFixed(3)} ${s.y.toFixed(3)}`)
    }
    const line = (p: { x: number; y: number }) => {
      const s = this.frame.toSvg(p)
      segs.push(`L ${s.x.toFixed(3)} ${s.y.toFixed(3)}`)
    }
    // Arc from current to target along the circle. Sweep=0 = visually CCW
    // in SVG y-down (= the direction our math-y-up CW walk produces).
    const arc = (target: { x: number; y: number }) => {
      const s = this.frame.toSvg(target)
      segs.push(`A ${r} ${r} 0 0 0 ${s.x.toFixed(3)} ${s.y.toFixed(3)}`)
    }

    for (let k = 0; k < 4; k++) {
      const i = (startIdx + k) % 4
      const j = (i + 1) % 4
      const a = corners[i]
      const b = corners[j]
      const aIn = inside[i]
      const bIn = inside[j]
      const ts = lineCircleParams(a, b, cxC, cyC, r)

      if (aIn && bIn) {
        if (!moved) {
          move(a)
          moved = true
        }
        line(b)
      } else if (aIn && !bIn) {
        const tExit = ts.find((t) => t > 1e-9 && t < 1 - 1e-9) ?? ts[0]
        const exit = {
          x: a.x + tExit * (b.x - a.x),
          y: a.y + tExit * (b.y - a.y),
        }
        if (!moved) {
          move(a)
          moved = true
        }
        line(exit)
      } else if (!aIn && bIn) {
        const tEnter = ts.find((t) => t > 1e-9 && t < 1 - 1e-9) ?? ts[0]
        const enter = {
          x: a.x + tEnter * (b.x - a.x),
          y: a.y + tEnter * (b.y - a.y),
        }
        if (!moved) {
          move(enter)
          moved = true
        } else {
          arc(enter)
        }
        line(b)
      } else {
        // both outside. With startIdx at an inside corner, this can happen
        // only between an earlier exit and a later enter — no draw needed,
        // the next enter's `arc()` traces the circle across.
      }
    }
    if (segs.length) segs.push('Z')
    return new Path(this.frame, segs.join(' '))
  }

  /** Emit this Rect as a closed Path (helper for boolean-op output). */
  toRectPath(): Path {
    const tl = this.frame.toSvg({ x: this.center.x - this.w / 2, y: this.center.y + this.h / 2 })
    const tr = this.frame.toSvg({ x: this.center.x + this.w / 2, y: this.center.y + this.h / 2 })
    const br = this.frame.toSvg({ x: this.center.x + this.w / 2, y: this.center.y - this.h / 2 })
    const bl = this.frame.toSvg({ x: this.center.x - this.w / 2, y: this.center.y - this.h / 2 })
    const d =
      `M ${tl.x.toFixed(3)} ${tl.y.toFixed(3)} ` +
      `L ${tr.x.toFixed(3)} ${tr.y.toFixed(3)} ` +
      `L ${br.x.toFixed(3)} ${br.y.toFixed(3)} ` +
      `L ${bl.x.toFixed(3)} ${bl.y.toFixed(3)} Z`
    return new Path(this.frame, d)
  }
}

/** Quadratic-solve helper: parameters t ∈ [0, 1] where segment a→b
 *  crosses the circle (cx, cy, r). Returns 0, 1, or 2 t-values, sorted. */
function lineCircleParams(a: Point, b: Point, cx: number, cy: number, r: number): number[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const fx = a.x - cx
  const fy = a.y - cy
  const A = dx * dx + dy * dy
  const B = 2 * (fx * dx + fy * dy)
  const C = fx * fx + fy * fy - r * r
  const disc = B * B - 4 * A * C
  if (disc < 0) return []
  const sd = Math.sqrt(disc)
  const t1 = (-B - sd) / (2 * A)
  const t2 = (-B + sd) / (2 * A)
  const out: number[] = []
  if (t1 >= 0 && t1 <= 1) out.push(t1)
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-9) out.push(t2)
  return out.sort((x, y) => x - y)
}

/* ── Polygon ─────────────────────────────────────────────────────── */

export class Polygon {
  readonly frame: Frame
  readonly vertices: Point[]

  constructor(frame: Frame, vertices: Point[]) {
    this.frame = frame
    this.vertices = vertices
  }

  /** Space-separated "x,y" pairs for SVG <polygon points="..." />. */
  toSvgPoints(): string {
    return this.vertices
      .map((p) => {
        const s = this.frame.toSvg(p)
        return `${s.x.toFixed(3)},${s.y.toFixed(3)}`
      })
      .join(' ')
  }
}

/* ── Path ────────────────────────────────────────────────────────── */

/**
 * A general SVG path. Produced by boolean operations on primitives, or
 * built directly. Unlike Circle/Rect/etc which are typed by their math
 * properties, Path is opaque — just a string of SVG-d commands.
 *
 * This is the result type of geometry composition: `rect.intersect(circle)`
 * returns a Path, which is a first-class shape (can be styled, transformed,
 * further composed). Visually equivalent to `<ClipInside>` for many cases,
 * but conceptually different: a NEW shape vs. a masked view of the old one.
 */
export class Path {
  readonly frame: Frame
  readonly d: string

  constructor(frame: Frame, d: string) {
    this.frame = frame
    this.d = d
  }

  toSvgD(): string {
    return this.d
  }
}

/* ── Line ────────────────────────────────────────────────────────── */

export class Line {
  readonly frame: Frame
  readonly from: Point
  readonly to: Point

  constructor(frame: Frame, from: Point, to: Point) {
    this.frame = frame
    this.from = from
    this.to = to
  }

  toSvgAttrs(): { x1: number; y1: number; x2: number; y2: number } {
    const a = this.frame.toSvg(this.from)
    const b = this.frame.toSvg(this.to)
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
}
