# vectx

**A descriptive language for AI-generated vector graphics.**

`vectx` is the layer between AI and the vector world. Instead of asking an
LLM to emit SVG path strings byte by byte — the failure mode every
existing vector-AI tool shares — `vectx` exposes shapes, frames, themes,
and semantic labels as first-class primitives that AI can both **generate
and understand** natively.

Targets: logo design · UI · print · web · app · games · CAD · cutting
machines · anywhere vector graphics need to be produced or interpreted by
a model.

---

## Why this exists

Vector × AI has been a problem area for years. Every notable approach
(Recraft, Adobe Firefly Vector, Iconscout AI, the entire long tail of
icon generators) makes the same architectural bet:

> Fine-tune a model to emit SVG path strings directly.

That bet has failed quietly and repeatedly. SVG was designed in 1999 for
human authors and printer drivers. Its representation works against the
grain of how LLMs reason:

- **Tokenization**: every digit in `m 911.25247,525.22917 c -4.4381,…`
  is its own token. Models fight context length and emit small numeric
  drift on every regenerate.
- **Implicit constraints**: a circle expressed as 4 cubic beziers needs
  the control-point ratio to be exactly 0.5523 for the curve to look
  round. Models output approximations, "round-ish" shapes accumulate.
- **No semantic surface**: `<path id="AL-01" d="m 911..."/>` — the id
  carries 100× more information than the geometry for a downstream
  reasoner. Pure-path models throw the id away.
- **Lossy round-trip**: load → edit → save through any AI pipeline
  produces drift. The IR can't carry editorial intent.

`vectx` takes the opposite bet: **make AI a first-class citizen of the
representation, not a translator into a representation designed for
something else.** Semantic intent up front; geometry compiled at the
edge.

---

## The shape of the language

### Forward direction · AI / human writes vectx → renders to anything

```ts
import { Frame, token, composeThemes, applyTheme } from 'vectx'

const f = Frame.centered(200)

// First-class: frames, primitives, derivation
const outerRing = f.circle({ r: 92 })
const innerRing = outerRing.inset(32)
const cells     = f.gridInside(innerRing, { cols: 2, rows: 3, gap: [3,3], padding: 5 })

// First-class: tokens + themes (Illustrator graphic-styles as algebra)
const sealRed = token<string>('seal.red', '#c2241e')
const ring = outerRing.style({ stroke: sealRed, strokeWidth: 4, fill: 'none' })

const sumi    = { 'seal.red': '#1c1611' }
const printer = { 'seal.red': '#a01a14' }
const final   = composeThemes(sumi, printer)  // right wins · associative
const styled  = applyTheme(ring.style, final) // eager · no token leaks downstream

// One spec compiles to many surfaces. SVG today; Canvas / PDF / DXF /
// G-code / JSON for LLM token budgets — same Spec, different backends.
```

### Inverse direction · any vector input → vectx for AI to read

```ts
import { recognize, emitDsl, renderRecognized } from 'vectx'

const rec = recognize(svgString)
console.log(emitDsl(rec))
```

The decoder pulls **semantic intent first** (id, aria-label, `<title>`,
`<desc>`, `<metadata>`, `<text>` content) — these are higher density than
any geometry parser can produce. Style strings get deduplicated. Opaque
paths are preserved verbatim when their internal structure isn't needed
by the model.

Tested on real-world inputs:

| Input | Bytes | Recovery channel | Cold-LLM identifies |
|---|---|---|---|
| 117th U.S. Congress districts | 2.5 MB · 436 paths | 435 `id="XX-NN"` labels | "US House district map · 117th · 2020 apportionment" |
| Standard Model of Elementary Particles | 38 KB · 385 text + 28 descs | text + doc semantics | "particle physics taxonomy · Forces · Fermions · Bosons · quarks · leptons · Higgs · Graviton" |

In both cases the LLM identifies the diagram **without parsing a single
bezier curve**. Geometry recovery happens lazily and only when needed.

---

## v0 scope

### What ships

- `Frame` — coordinate system, math y-up, CCW angles. Nested frames.
- Primitives — `Circle`, `Arc`, `Ellipse`, `Rect`, `Polygon`, `Star`, `Line`, `Path`
- Derivation — `inset`, `arcSpan`, `arcCentered`, `intersect`, `concentric`
- Layout — `grid`, `gridFill`, `gridInside`, polygon helpers
- Theme — `token<T>(name, fallback)`, `Theme`, `composeThemes`, `applyTheme`. Associative + right-wins. Bundle tokens.
- Inverse pipeline — `parseSvg` → `recognize` → `emitDsl` / `renderRecognized`
- Style dedup (~95% compression of inline `style="…"` redundancy)
- Semantic extraction — id, aria-label, `<title>`, `<desc>`, `<metadata>`, `<text>`

### What's deliberately NOT shipped (out-of-scope for v0)

These are not bugs to be filed; they are choices.

- `<defs>` resolution — gradients, patterns, filters, masks, clipPath.
  These are visual effects, not intent. AI reasoning doesn't need them.
- `<g transform>` flatten. Same reason.
- Faithful pixel-perfect round-trip. We accept lossy semantic compression
  as the cost of being AI-friendly.
- Path-d token-level parser (M/L/H/V/C/S/Q/T/A). Opaque preservation is
  enough until a use case requires reasoning over path internals.
- Polygon-from-path / circle-from-bezier recognition. Same.

The principle: **fidelity is the compile target's job, not the IR's**.

---

## Compile targets

| Target | Status | Notes |
|---|---|---|
| SVG | ✓ | `toSvgAttrs()`, `toSvgD()`, JSX via `renderRecognized` |
| Canvas 2D | planned | direct `ctx.arc/rect/path` emission |
| PDF | planned | via pdf-lib or jsPDF |
| DXF | planned | for CAD interchange |
| G-code | planned | for CNC / laser cutters |
| DST / EMB | planned | embroidery machines |
| JSON | planned | LLM-friendly serialization |

Same spec → many surfaces. The thesis is that **AI authors at the spec
level, never at the target level**. Targets are the integration story.

---

## How to use

```bash
# Library only (peer dep on React for JSX render helpers)
npm install vectx

# Run the demo locally
git clone <repo>
cd vectx
bun install
bun run dev
```

Look at `fixtures/` for the validation inputs (Wikimedia Commons, public
domain or trademark-as-fair-use).

---

## Status

Experimental. **v0 hits "thesis validated" on two canonical inputs.** The
roadmap is open — the next gate is automated benchmark across ~50 wild
SVGs, then we decide whether this becomes a library, a service, or
something else.

Extracted from the [GOLIA seals lab](https://golia.ai/seals) where it
co-evolved with a real domain need (印章 form rendering + AI-driven seal
generation).

---

## Naming

`vectx` ≈ vector × AI. Also reads as "vector exchange" (the bidirectional
language between AI and the vector world).

---

## License

MIT
