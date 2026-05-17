# DECLARE — vectx project glossary

This file is the project's internal glossary. It records terms that have a specific in-project meaning beyond their plain-English reading — so later references in BOUNDARY, READMEs, commit messages, code comments, and conversation stay unambiguous.

Add a term here the moment it picks up project-specific meaning. Edits welcome; keep entries terse.

---

## Naming

**vectx** is *both* the project name *and* the name of the language the project implements. By default, "vectx" means both at once. Only disambiguate when context forces it:

- "the **vectx project**" / "the vectx repo" — the whole codebase, repo `goliajp/vectx`, BOUNDARY, tooling, web showcase, etc.
- "the **vectx DSL**" / "the vectx language" — specifically the descriptive language itself (vocabulary + grammar + semantics).
- "the **vectx package**" / "the vectx crate" — a specific registry artifact (e.g. `vectx` on npm, `vectx` on crates.io, `vectx-wasm` on either).

Capitalization: **vectx is lowercase everywhere** — file names, package names, prose citations. The only exception is display typography (mastheads like `GOLIA / VECTX`) where ALL CAPS is a *typographic* choice, not a naming change.

---

## Modules (architecture)

The project decomposes into four modules. Scope per module lives in [BOUNDARY.md](./BOUNDARY.md).

- ❶ **AUTHORING** — the forward path. The DSL's primitives, combinators, and theme system. Code: `src/frame.ts`, `src/theme.ts`, `src/jsx.tsx`. Output: SVG.
- ❷ **DECODER** — the inverse path. SVG → recognize → emit DSL → render. Validates that AUTHORING's vocabulary actually covers real-world SVG. Code: `src/decode.tsx`.
- ❸ **SPEC** — the language definition Claude reads as a system prompt or skill instruction. The "user manual" of the DSL. *Not yet written.*
- ❹ **INTEGRATION** — Claude Code skill + CLI command. How a developer reaches vectx through Claude. *Not yet written.*

Orthogonal in-scope items (not modules): fixtures + tests, the `web/` showcase, name reservations on npm + crates.io.

---

## DSL vocabulary

- **DSL** — domain-specific language; a small language designed for one domain. vectx is a DSL for describing vector graphics, as opposed to general-purpose languages like TypeScript or Rust.
- **embedded DSL** — a DSL hosted inside another language's syntax. vectx today is embedded in TypeScript (`Frame()`, `Circle()`, `grid()` are TS function calls), not parsed as a standalone text format.
- **forward path** — writing vectx → rendering SVG. Owned by ❶ AUTHORING.
- **inverse path** — taking existing SVG → recovering vectx that would produce an equivalent rendering. Owned by ❷ DECODER.
- **round-trip** — `svg → recognize(svg) → emitDsl(rec) → render(rec)` — three boundaries, four artifacts. The proof that the language is expressive enough to describe what it sees.
- **compile target** — what vectx renders into. v0: only SVG. Out-of-scope (per BOUNDARY): Canvas, PDF, DXF, G-code, JSON IR, DST embroidery, etc.
- **recognize / emitDsl / renderRecognized** — the three functions inside ❷ DECODER. `recognize(svg) → Recognized`, `emitDsl(rec) → string`, `renderRecognized(rec) → ReactNode[]`.
- **fixture** — one of the SVGs in `fixtures/` we test the decoder against (currently 5: `congress`, `standard-model`, `tiger`, `firefox`, `inkscape`). Each carries a `failureNote` describing what should or shouldn't round-trip.

---

## Roles & audience

- **primary author** — Claude (Anthropic's family). vectx is tuned for Claude's strengths and weaknesses, not for a generic LLM.
- **primary consumer** — a developer reaching vectx through Claude Code or the Claude CLI. They typically do *not* hand-write vectx; Claude does.
- **end user** — eventually, the human who looks at the rendered SVG somewhere downstream. v0 does not optimize their experience directly; that's whoever ships the output's job.

---

## Process

- **BOUNDARY** — the v0 scope contract. Frozen on 2026-05-16. Edits require a commit prefixed `boundary:`. See [BOUNDARY.md](./BOUNDARY.md).
- **DECLARE** — this file. The glossary. No special commit prefix.
- **stub / name reservation** — 0.0.0 placeholder packages on npm + crates.io that lock the `vectx` / `vectx-wasm` names without shipping functional code. Sources in `publish-stubs/`.
- **alpha / v0** — current phase. Pre-SPEC, pre-skill, pre-CLI. Versions written as `0.0.x`. Anything can change.
