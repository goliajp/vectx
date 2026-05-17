# Fonts — engineered vector portfolios as vectx's heaviest stress test

| | |
|---|---|
| date | 2026-05-17 |
| topic | fonts as the proof case for vectx's expressive completeness |
| status | shelved · v1+ aspiration · awaiting playground idea |
| playground | none yet (open call) |

---

## TL;DR

A typeface is the densest engineered vector design we ship as a single product — 500 to 100,000+ glyphs that must read as "one designer's hand". If vectx can describe one **typeface with at least one dynamic feature**, we will have proven the language covers the hardest 2D corner of the vector world. This is a v1+ aspiration shelved here for later; no playground exists yet.

## The goal in one line

> Use vectx to make at least one font with a dynamic feature.

Where "dynamic feature" could be any of:

- **Variable font** — one or more interpolation axes (weight, width, slant, optical size, custom). The classic OpenType `fvar` / `gvar` / `STAT` / `MVAR` story. One vectx description → continuous glyph space.
- **Parametric / procedural font** — each glyph is a function of parameters (stroke thickness, contrast ratio, terminal shape). The vectx DSL would author the parametric rules; the font format stores either the interpolated outline or the function itself.
- **Context-aware** — OpenType features (`liga`, `calt`, `salt`, `frac`, …) expressed natively in the DSL.
- **Reactive / animated** — glyphs that change with input (speed, audio, viewport, time). Closer to motion design than traditional font; might require its own runtime.
- **Generative** — a model conditioned on vectx primitives produces new typefaces in the same family system. Highest leverage but furthest out; depends on AI-authoring upstream (BOUNDARY thesis literally).

The MVP target is probably **(1) Variable font** or **(2) Parametric** — they overlap and they're the most mature in tooling and industry expectation.

## Why fonts matter for vectx

A font tests the language at every axis:

- **Scale**: 500–100k assets. Forces the DSL to support repetition + inheritance natively rather than as a workaround.
- **Consistency under composition**: every glyph belongs to the same family — strokes, x-height, contrast, terminal shape, kerning rhythm. The vectx theme/token + parameterized-primitive idea has to actually cover this without leaks.
- **Format-as-data**: a font isn't a single outline, it's a stack: outlines + hinting + metrics + opentype features + variation axes. vectx as a single language has to either map cleanly to these or pick the subset we care about.
- **Industry validation**: the field already accepts continuous design spaces (variable fonts have shipped since 2016). It's not theoretical; it's a $X billion industry built on differentiable vector graphics. We aren't inventing demand.

## Where vectx connects

These are entry points, not commitments:

- **❶ AUTHORING** adds `Glyph` (codepoint + outline + metrics) and `Typeface` (a set of glyphs sharing theme). `theme` tokens already match the "design family rules" vocabulary needed.
- **Variable axis ≈ theme axis**. A vectx `theme` parameterized over `weight: 0..1` interpolates all the tokens — extending that to glyph outlines is the same idea applied to geometry.
- **❷ DECODER**: parsing a TTF/OTF into vectx form has independent business value (font reverse engineering / forking / variation is a real workflow, less ethically clean than SVG round-trip but the demand exists).
- **SDF research adjacency**: glyphs rendered via SDF (specifically MSDF — multi-channel SDF — Valve / Mapbox 2007+) give scale-free GPU rendering. vectx → MSDF → screen is a clean pipeline.
- **DiffVG adjacency**: differentiable interpolation in axis space is exactly variable fonts. Optimizing the axis position to match a target raster image is a known technique.

## Prior art (we are not pioneering)

- **Glyphs / FontLab / RoboFont / Birdfont** — the production typeface design suites. Mature, expensive (Glyphs ~€300, FontLab ~$500), proprietary. Each has its own internal model.
- **UFO (Unified Font Object)** + **DesignSpace** — the open-source format from RoboFab/RoboFont ecosystem. Plain-XML directory layout, parseable, version-controllable. Possibly vectx's natural interop format.
- **OpenType + variable font spec** — the W3C / Microsoft / Adobe standard. `fvar`, `gvar`, `cff2`, `MVAR`, `STAT`. Mature, browser-supported, not going anywhere.
- **MSDF** — multi-channel signed distance fields for sharp GPU-rendered glyphs at any scale. Chris Green (Valve, 2007 paper) → Viktor Chlumsky (msdfgen, 2014+) → Mapbox / Three.js / game engines.
- **Adobe Firefly type / Monotype AI type / character.ai type** — current crop of AI-generated typefaces. State of the art produces "looks like a font" outputs but loses metric + feature integrity. The exact gap that an AI-friendly DSL would close.

## What we're waiting on

Two things before this topic moves from "shelved" to "active":

1. **A playground idea** — not yet. The user explicitly hasn't formed one. Open call: what's the smallest visual that conveys "vectx is authoring a glyph" without becoming a full font editor? Maybe one letter (e.g. lowercase `a`) parameterized over weight + width via vectx primitives, rendered live as the axes slide.
2. **AUTHORING + SPEC modules existing**. Fonts need a real DSL to bind to. Today vectx has `Frame / Circle / Path / grid / theme` — enough to draw a glyph but not yet enough to compose 500. v0 SPEC is the blocker, then experimentation here is feasible.

## Open questions

1. **UFO as input/output format?** UFO is well-supported and human-readable; if vectx authors UFO files, we plug into the existing toolchain instead of competing with it.
2. **Variable or parametric first?** Variable fonts are an industry standard; parametric fonts are more programmer-natural. The MVP could be either; the right choice depends on which production pipeline we want to land in.
3. **Where does kerning / metric live?** In OpenType these are tables, not glyph geometry. vectx needs a "metric" or "spacing" concept distinct from "shape" to model this cleanly.
4. **Hinting** — the rendering-at-low-resolution problem. Modern web mostly skips manual hinting (using SDF / subpixel AA / variable-size font sizes). Skipping hinting in vectx's first font is probably fine; it's a deep specialist subfield.

## Related research topics

- [`sdf-2d/`](../sdf-2d/) — SDF is the rendering substrate; MSDF is its font extension.
- `diff-vg/` (not yet written) — differentiable rendering; axis-space optimization is the direct font application.
- `webgpu-tessellation/` (not yet written) — if we go marching-squares-to-SVG for SDF glyphs, GPU tessellation matters.

## References

- Microsoft · [OpenType specification](https://learn.microsoft.com/en-us/typography/opentype/spec/)
- Variable fonts overview · [v-fonts.com](https://v-fonts.com/) (catalog of shipped variable fonts)
- UFO / DesignSpace · [Unified Font Object](https://unifiedfontobject.org/)
- Chris Green · [Valve 2007 SDF paper](https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf)
- Viktor Chlumsky · [msdfgen](https://github.com/Chlumsky/msdfgen)
- Glyphs · [glyphsapp.com](https://glyphsapp.com/) (canonical commercial typeface tool)
