# AUTHORING surface design — math/physics-aligned IR for an LLM author

| | |
|---|---|
| date | 2026-05-18 |
| topic | how ❶ AUTHORING's API surface should be shaped, given Claude is the primary author |
| status | exploration · audit pending · v0 finalize candidate |
| playground | none yet · open call: a "draw the same shape in 5 dialects" comparison that runs in browser |

---

## TL;DR

vectx's ❶ AUTHORING module is the language Claude writes vector design in. Its API surface should be shaped by three coupled principles:

1. **LLM-masterable** — predictable, declarative, default-tolerant, locally-reasoned.
2. **Refined / modern** — clean TS signatures, immutable values, FP composition, no legacy accidents bleeding through.
3. **Math / physics-aligned** — borrow nomenclature wherever it overlaps standard math/physics notation, because *that's where Claude's training mass is*.

(3) is the strongest lever. Using `radius` / `vector` / `matrix` / `radians` / `norm` / `parametric curve` / `affine transform` as canonical = the LLM imports its existing math intuitions for free. CAD-specific or SVG-quirky names live in far smaller training corpora.

The current API leans **SVG-ish** (`cx, cy`, degrees, hex colors). This note proposes an audit that tilts the IR toward **math-ish** without breaking what already works, and identifies the open questions worth resolving before ❹ SPEC is written.

---

## Two distinct problems often conflated

When we say "authoring" there are *two* concerns, and they should not collapse into one:

| problem                                                            | who owns it                  |
|--------------------------------------------------------------------|------------------------------|
| **(1) syntax / artifact design** — what the language looks like    | ❶ AUTHORING                  |
| **(2) authoring quality** — does the LLM produce good outputs in it | mostly ❹ INTEGRATION         |

They couple — a great (1) lifts the floor of (2), and a great (2) compensates for some warts in (1). But you can't out-prompt bad syntax for long, and you can't get aesthetic output from a clean syntax without teaching either.

**(2) is the goal; (1) is the foundation.** This note is about (1). (2) is its own research thread to open after AUTHORING freezes.

---

## Why math/physics-aligned is the highest leverage

LLMs have read more math and physics than any other genre — papers, textbooks, every numpy / scipy / MATLAB / Mathematica codebase, decades of SIGGRAPH papers, Khan Academy, every linear algebra lecture transcribed online. The vocabulary used there is *stable across centuries*:

- Cartesian coordinates `(x, y)`
- Vectors as `v = (vx, vy)` or `Vec2`
- Norm / magnitude `||v||` / `length(v)`
- Affine transforms (translate / rotate / scale / shear) as composable matrices
- Angles in radians (math standard)
- Parametric curves `f(t) = (x(t), y(t))`
- Bezier control points `P0 / P1 / P2 / P3`
- Set operations on shapes — union / intersection / difference / symmetric-difference
- Continuous color spaces — HSL / Lab / LCH (mapped to RGB for display only)
- Composition `f ∘ g`

By contrast, `cx` / `cy` (SVG abbreviation), `transform="rotate(30) scale(1.2)"` (SVG string mini-DSL), `#c2241e` (hex, no perceptual structure), `M 0 0 L 10 10` (path-data minilanguage) live in much smaller training corpora. The LLM has seen them, but doesn't have the same *deep* prior to lean on.

**Every place vectx can use math/physics names instead of CAD/SVG-quirky names, Claude's authoring improves at zero teaching cost.** This is the cheapest correctness gain available.

---

## Current vs proposed (the audit table)

Current vectx (`src/frame.ts`, `src/theme.ts`) leans SVG-ish. Proposed direction:

| concept            | SVG-ish (current)              | math-ish (proposed)                                  |
|--------------------|--------------------------------|------------------------------------------------------|
| circle             | `cx, cy, r`                    | `center: Vec2, radius: number`                       |
| rectangle          | `x, y, w, h`                   | `origin: Vec2, extent: Vec2`                         |
| coordinate system  | y-down, top-left origin        | y-up, center or bottom-left (math standard)          |
| angles             | degrees                        | radians (math standard)                              |
| transforms         | string `"rotate(30) scale(1.2)"` | composed function `R(π/6) ∘ S(1.2)`                |
| paths              | path-data string `M ... L ...` | parametric `[Line(p0,p1), Bezier(p0,p1,p2,p3), …]`   |
| color              | hex `#c2241e`                  | `hsl(h,s,l)` or `lab(L,a,b)`                         |
| distance / norm    | (not first-class)              | `norm(v)` / `length(v)` (matches GLSL / numpy)       |
| composition        | (not first-class)              | `compose(f, g)`                                      |
| units              | pixels implicit                | dimensionless; pixel mapping at ❷ RENDERER time      |

**The crux**: SVG's quirks (y-down, degrees, hex, path-data) are 1990s XML-era compromises. They are *not load-bearing* for vectx's IR. ❷ RENDERER is the right place for those impedance matches — it converts the math-pure IR to SVG conventions on output.

This aligns directly with the BOUNDARY principle that **vectx is a new vector format, deliberately not a superset of SVG**. The IR is math-pure; SVG is one output target among future siblings (Canvas, PDF, DXF).

---

## Tension and resolution

The cost of math-ish: **lower familiarity for web designers used to CSS conventions** (degrees, hex, transform strings).

Resolution: BOUNDARY's first commitment is *AI is the primary author, not the human designer*. Claude's training mass on math > a designer's familiarity with CSS shorthand. Math wins on first principles.

If human authors are ever onboarded later, a thin sugar layer (`hexColor()`, `degrees()` helpers) can shadow the math-pure core. That's a v1+ ergonomics question, not a v0 constraint.

---

## Open questions (resolve before AUTHORING freezes)

1. **y-up or y-down origin?** Math standard is y-up; SVG / Canvas are y-down. Render-time flip is one line, but: does Claude's spatial reasoning generalize better in one or the other? Worth an eval — could be a small cold-LLM experiment.
2. **Pixel-implicit vs dimensionless units?** vectx values like `r: 10` today mean "10 pixels". Math-pure would mean "10 abstract units, mapped to pixels at render". Cleaner but adds one indirection in mental model.
3. **Path representation: parametric vs path-data string?** Parametric segment list is math-aligned; path-data string is universal. Could support both — parametric as *primary*, with a `pathFromD(...)` constructor as escape hatch.
4. **Color canonical: HSL, Lab, or LCH?** Lab/LCH are perceptually uniform (best for design); HSL is mid familiar; RGB/hex flat but universal. Tentative pick: **HSL primary, LCH for design-critical work, hex purely a render-output detail**.
5. **Aesthetic vocabulary**: tokens like `goldenRatio` / `opticalBalance` / `harmonicSpacing` — do they belong in ❶ AUTHORING as primitives, or in ❹ INTEGRATION as part of the spec / skill teaching layer? Probably the latter (they're craft heuristics, not language primitives), but worth deciding.

---

## Audit plan (the concrete next step when this graduates)

1. Read `src/frame.ts` + `src/theme.ts` + `src/jsx.tsx` end to end.
2. Annotate every public API against the three principles and the trade-off table above.
3. Produce a **delta list**: keep / rename / refactor / drop / open question.
4. Resolve the five open questions (above) via short experiments or owner decision.
5. Land the chosen deltas. **All changes must happen *before* ❹ SPEC is written**, because SPEC describes the language. Once SPEC is written, every API change is a `boundary:` commit *and* a spec rewrite.
6. Freeze ❶ AUTHORING. Move on to ❹ SPEC and ❹ skill / CLI.

The audit's output is the v0 freeze point for the language.

---

## What this note is *not*

It's research on the **shape of the language**, not on **how to teach Claude to write beautiful things in it**. That's a separate thread, to open under ❹ INTEGRATION (SPEC + skill examples + cold-LLM eval) after AUTHORING freezes.

It's also not a refactor proposal yet — `src/frame.ts` could need fewer or more changes than the table implies. The audit is the concrete next step.

---

## Playground idea (open call)

The cleanest playground for this thread would be: **"draw the same shape in N dialects, side by side"**. A single circle rendered four ways:

1. SVG-ish vectx: `Circle({cx: 100, cy: 100, r: 50})`
2. Math-ish vectx: `Circle({center: [100, 100], radius: 50})`
3. Raw SVG: `<circle cx="100" cy="100" r="50"/>`
4. Pure math: `f(θ) = (100 + 50·cos θ, 100 + 50·sin θ), θ ∈ [0, 2π]`

Same output, different surfaces. Each surface's *token count*, *aesthetic*, and *LLM-write-correctness* compared. Could even run a small cold-LLM eval inline.

Not yet built. If a clean version comes to mind, lands here as `playground.html`.

---

## Related research topics

- [`sdf-2d/`](../sdf-2d/) — SDFs are themselves math-pure (each shape is a function `ℝ² → ℝ`). They're the natural extension of this principle into "the IR includes implicit surfaces".
- [`fonts/`](../fonts/) — fonts are the final stress test for an LLM-author IR. Variable font axes are a continuous parameter space — exactly the math-pure direction.
