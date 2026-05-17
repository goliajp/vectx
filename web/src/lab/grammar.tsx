import type { ReactNode } from 'react'

/**
 * Grammar lab — vectx authoring surface variants side by side.
 *
 * Each concept is rendered twice: current SVG-ish dialect on the left
 * (column c2), proposed math/physics-aligned dialect on the right
 * (column c3). The renders are intentionally identical because the
 * *output* doesn't differ — only the writing surface does. That's the
 * whole point: same shape, two languages for it, pick the one Claude
 * writes correctly more often.
 */

type Variant = {
  code: string
  preview: ReactNode
  note?: string
}

type Concept = {
  id: string
  label: string
  hint?: string
  current: Variant
  proposed: Variant
}

const TXT_BLACK = '#1c1611'
const TXT_RED = '#c2241e'

function ViewBox({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      className="vx-grammar-svg"
      aria-hidden
    >
      <rect x="0" y="0" width="200" height="200" fill="#fdfaf0" />
      {children}
    </svg>
  )
}

const CONCEPTS: Concept[] = [
  {
    id: 'circle',
    label: 'CIRCLE',
    hint: 'center as a tuple is half a hint to the LLM that vectors are first-class',
    current: {
      code: `Circle({ cx: 100, cy: 100, r: 50 })`,
      preview: (
        <ViewBox>
          <circle cx={100} cy={100} r={50} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
    proposed: {
      code: `Circle({ center: [100, 100], radius: 50 })`,
      preview: (
        <ViewBox>
          <circle cx={100} cy={100} r={50} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
  },
  {
    id: 'rect',
    label: 'RECTANGLE',
    hint: 'origin + extent reads as "where" + "how big" rather than four loose scalars',
    current: {
      code: `Rect({ x: 40, y: 60, w: 120, h: 80 })`,
      preview: (
        <ViewBox>
          <rect x={40} y={60} width={120} height={80} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
    proposed: {
      code: `Rect({ origin: [40, 60], extent: [120, 80] })`,
      preview: (
        <ViewBox>
          <rect x={40} y={60} width={120} height={80} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
  },
  {
    id: 'rotation',
    label: 'ROTATION · 30°',
    hint: 'composed function instead of a string mini-DSL — LLMs already know rotation matrices',
    current: {
      code: `Group({ transform: 'rotate(30 100 100)' }, Rect({ x: 50, y: 70, w: 100, h: 60 }))`,
      preview: (
        <ViewBox>
          <g transform="rotate(30 100 100)">
            <rect x={50} y={70} width={100} height={60} fill={TXT_BLACK} />
          </g>
        </ViewBox>
      ),
    },
    proposed: {
      code: `R(π/6, around: [100, 100])(Rect({ origin: [50, 70], extent: [100, 60] }))`,
      preview: (
        <ViewBox>
          <g transform="rotate(30 100 100)">
            <rect x={50} y={70} width={100} height={60} fill={TXT_BLACK} />
          </g>
        </ViewBox>
      ),
    },
  },
  {
    id: 'color',
    label: 'COLOR · vermillion',
    hint: 'HSL has structure (hue ring, lightness ramp); hex is just an integer in disguise',
    current: {
      code: `Circle({ cx: 100, cy: 100, r: 60, fill: '#c2241e' })`,
      preview: (
        <ViewBox>
          <circle cx={100} cy={100} r={60} fill={TXT_RED} />
        </ViewBox>
      ),
    },
    proposed: {
      code: `Circle({ center: [100, 100], radius: 60, fill: hsl(2, 73, 44) })`,
      preview: (
        <ViewBox>
          <circle cx={100} cy={100} r={60} fill={TXT_RED} />
        </ViewBox>
      ),
    },
  },
  {
    id: 'path',
    label: 'PATH · two-segment',
    hint: 'parametric segments expose the math; the path-data string is opaque to the LLM',
    current: {
      code: `Path({ d: 'M 30 160 L 100 50 L 170 160 Z' })`,
      preview: (
        <ViewBox>
          <path d="M 30 160 L 100 50 L 170 160 Z" fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
    proposed: {
      code: `Path([Line([30, 160], [100, 50]), Line([100, 50], [170, 160]), Close()])`,
      preview: (
        <ViewBox>
          <path d="M 30 160 L 100 50 L 170 160 Z" fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
  },
  {
    id: 'composition',
    label: 'COMPOSITION · 3 shapes',
    hint: 'a flat children array vs a math-flavoured Group; same nesting, different vocabulary',
    current: {
      code: `Frame({ w: 200, h: 200 },
  Circle({ cx: 60, cy: 100, r: 28 }),
  Circle({ cx: 140, cy: 100, r: 28 }),
  Rect({ x: 70, y: 130, w: 60, h: 14 }),
)`,
      preview: (
        <ViewBox>
          <circle cx={60} cy={100} r={28} fill={TXT_BLACK} />
          <circle cx={140} cy={100} r={28} fill={TXT_BLACK} />
          <rect x={70} y={130} width={60} height={14} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
    proposed: {
      code: `Frame({ extent: [200, 200] }, [
  Circle({ center: [60, 100],  radius: 28 }),
  Circle({ center: [140, 100], radius: 28 }),
  Rect  ({ origin: [70, 130],  extent: [60, 14] }),
])`,
      preview: (
        <ViewBox>
          <circle cx={60} cy={100} r={28} fill={TXT_BLACK} />
          <circle cx={140} cy={100} r={28} fill={TXT_BLACK} />
          <rect x={70} y={130} width={60} height={14} fill={TXT_BLACK} />
        </ViewBox>
      ),
    },
  },
]

export function GrammarLab() {
  return (
    <div className="vx-grammar">
      <header className="vx-grammar-axis">
        <div className="vx-grammar-axis-cell mono">CURRENT · SVG-ISH</div>
        <div className="vx-grammar-axis-cell mono">PROPOSED · MATH-ISH</div>
      </header>
      <div className="vx-grammar-rows">
        {CONCEPTS.map((c) => (
          <article key={c.id} className="vx-grammar-row">
            <header className="vx-grammar-row-head">
              <span className="mono vx-grammar-row-label">{c.label}</span>
              {c.hint && <span className="vx-grammar-row-hint">{c.hint}</span>}
            </header>
            <Cell variant={c.current} />
            <Cell variant={c.proposed} />
          </article>
        ))}
      </div>
    </div>
  )
}

function Cell({ variant }: { variant: Variant }) {
  return (
    <div className="vx-grammar-cell">
      <pre className="mono vx-grammar-code">
        <code>{variant.code}</code>
      </pre>
      <div className="vx-grammar-preview">{variant.preview}</div>
      {variant.note && <p className="vx-grammar-cell-note">{variant.note}</p>}
    </div>
  )
}
