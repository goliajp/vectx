# SDF in 2D — research note

| | |
|---|---|
| date | 2026-05-17 |
| topic | signed distance fields as a candidate vectx primitive family |
| status | exploration · not a v0 decision · v1+ candidate |
| playground | [`./playground.html`](./playground.html) — open in any modern browser |

---

## TL;DR

vectx today has primitives like `Circle({cx, cy, r})` that describe shapes by their *parameters*. There is a parallel family — **signed distance fields** (SDFs) — that describes shapes by their *distance function*. SDF primitives **compose via arithmetic** (`min`/`max`), and they support **smooth blending** in one line with one parameter `k`.

This isn't in vectx yet. It might be the single highest-leverage addition for v1+.

## Why this matters

The thesis ("the descriptive language between AI and the vector world") rewards three properties in a DSL:

1. **Composability without ceremony** — fewer ways for an LLM to mis-compose primitives.
2. **Continuous parameters** — gradient-descent-friendly representations (downstream: differentiable rendering).
3. **Single uniform vocabulary** — same kind of shape under union/intersect/subtract.

SDFs deliver all three. Traditional path-based vector primitives don't (booleans need a polygon-clipping library; smooth blends fake it via `feGaussianBlur` + threshold; nothing is gradient-friendly).

## What an SDF is

A signed distance field is a function `f: ℝ² → ℝ`. For a point `p`:

- `f(p) < 0` ⇒ inside the shape
- `f(p) > 0` ⇒ outside the shape
- `|f(p)|` ⇒ distance to the nearest boundary

Classical 2D primitive formulas (all canonical, originally from Inigo Quilez):

| primitive       | formula                                                              |
|-----------------|----------------------------------------------------------------------|
| `sdCircle(p,r)` | `length(p) − r`                                                      |
| `sdBox(p,b)`    | `length(max(abs(p)−b, 0)) + min(max((abs(p)−b).x, (abs(p)−b).y), 0)` |
| `sdLine(p,a,b)` | distance from `p` to segment `ab`                                    |
| `sdPolygon`     | iterative — distance to nearest polygon edge                         |

Every shape commonly used in vector graphics has an SDF formulation.

## Why it's special — booleans as arithmetic

Composition is pure scalar arithmetic, no polygon-clipping library, no path Booleans:

```
union(a, b)         = min(a, b)
intersection(a, b)  = max(a, b)
subtraction(a, b)   = max(a, -b)
xor(a, b)           = max(min(a, b), -max(a, b))
```

And the **killer feature** that SVG cannot express natively:

```
h = clamp(0.5 + 0.5 · (b − a) / k, 0, 1)
smoothUnion(a, b, k) = mix(b, a, h) − k · h · (1 − h)
```

Two circles touching with `k = 0.08` produce a **butter-soft, filleted seam** — what designers call a "metaball". `k = 0` is the hard union. The transition is parametric. SVG approximates this with `feGaussianBlur` + thresholding, which is slow and lossy. SDFs do it as one polynomial.

Open `./playground.html` and slide `k` from 0 to 0.5 — you'll see the seam open up.

## What a vectx SDF DSL could look like (hypothetical, v1+)

A second primitive family alongside the current `Frame/Circle/Path/grid`:

```ts
import { sdf, Frame } from 'vectx'

const blob = sdf.smoothUnion(
  sdf.circle({ cx: -25, cy: 0, r: 35 }),
  sdf.box({ cx: 25, cy: 0, w: 56, h: 44 }),
  { k: 0.08 },
)

Frame({ w: 200, h: 200 }, blob)
```

The renderer compiles `blob` to one of:

- a rasterized image / `<image>` (cheap, lossy at zoom)
- a marching-squares-tessellated `<path>` (clean SVG, more code)
- a live `<canvas>` viewer running the shader (browser-only, but exact)

Decision deferred. For v1 a marching-squares path is the obvious answer; rasterization is the fallback.

## What the playground demonstrates

`./playground.html` is a single HTML file, ~250 lines including a WebGL2 fragment shader. Each pixel evaluates an SDF for the current scene (one circle + one animated box) and shades accordingly.

Controls:

- **op** — switch between union / intersection / subtraction / smooth union
- **k** — slide smooth-union seam from hard (0) to very soft (0.5)
- **distance shells** — visualize the SDF as concentric stripes outside the shape; makes the distance-function nature palpable
- **animate** — pause/resume the box motion

No build, no deps, no server. Just open the file. Works on file:// in any browser that supports WebGL2 (everything modern).

## Open questions

1. **SVG compile target.** Tessellate → `<path>` via marching squares (clean, larger file) or rasterize → `<image>` (lossy at zoom)? A hybrid is possible.
2. **API namespace.** Separate `sdf.circle / sdf.box` family, or extend existing primitives with an `.sdf` mode? The first is more explicit; the second composes better with `Frame`-style scaffolding.
3. **Importer side.** Can we *recognize* SDF intent in existing SVG? Direct decoding no — but we could detect "this is two shapes plus a Gaussian blur faking a smooth union" and emit `sdf.smoothUnion(...)` in DSL output. Phase-2 importer feature.
4. **Differentiable angle.** SDF formulas are smooth + composable → naturally differentiable. Gradient-descent target images to SDF parameters is the DiffVG line of research. Its own topic; see "related" below.

## Related topics (not yet written, candidates)

- `diff-vg/` — differentiable vector graphics, depends on this
- `webgpu-tessellation/` — replace WebGL2 with compute shaders if marching squares becomes the chosen compile target
- `isometric-layer/` — 3 → 2 projection as a DSL primitive
- `instancing/` — `<use>`-style one-def-many-placements for AI bandwidth compression

## References

- Inigo Quilez · [2D distance functions](https://iquilezles.org/articles/distfunctions2d/)
- Inigo Quilez · [smooth minimum](https://iquilezles.org/articles/smin/)
- MIT · [DiffVG · differentiable vector graphics](https://people.csail.mit.edu/tzumao/diffvg/)
- Patrick Walton · [Pathfinder](https://github.com/servo/pathfinder) — GPU-tessellated vector
