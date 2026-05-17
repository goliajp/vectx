# vectx v0

> Frozen on 2026-05-16. One file, six sections — covering what vectx is,
> the names and terms used for it, the four modules, what's in and out
> of scope, the glossary, and when scope can be re-opened.
>
> **Edit rules**:
> - Changes to **scope** (Modules / In scope / Out of scope / Re-open
>   conditions) require a commit message tagged `boundary:` and a short
>   note on what moved and why.
> - Changes to **naming** or the **glossary** just need to be terse and
>   accurate; no prefix required.
> - No silent edits.

---

## Thesis (L1)

vectx is the descriptive language between AI and the vector world. **AI is the primary author** — every spec, error message, and ergonomic choice is downstream of that.

---

## Naming

**vectx** is *both* the project name *and* the name of the language the project implements. By default, "vectx" means both at once. Only disambiguate when context forces it:

- "the **vectx project**" / "the vectx repo" — the whole codebase, repo `goliajp/vectx`, tooling, web showcase, etc.
- "the **vectx DSL**" / "the vectx language" — specifically the descriptive language itself (vocabulary + grammar + semantics).
- "the **vectx package**" / "the vectx crate" — a specific registry artifact (e.g. `vectx` on npm, `vectx` on crates.io, `vectx-wasm` on either).

Capitalization: **vectx is lowercase everywhere** — file names, package names, prose citations. The only exception is display typography (mastheads like `GOLIA / VECTX`) where ALL CAPS is a *typographic* choice, not a naming change.

---

## Primary author / consumer (v0)

- **PRIMARY AUTHOR**: Claude — specifically Anthropic's Claude family. The DSL is tuned for Claude's strengths and weaknesses, not for a generic LLM.
- **PRIMARY CONSUMER**: people using Claude via **Claude Code** or the **Claude CLI**. The canonical use path in v0 is:
  > User asks Claude to make a vector asset → Claude writes vectx code in a Claude Code / CLI session → vectx renders or compiles it to SVG.
- Other Claude surfaces (Claude API direct calls, claude.ai web chat) are **not blocked** but are **not tuned for** in v0. They work to the extent that Code/CLI paths work.
- This is **not** a designer-facing tool. There is no GUI use case in v0.

---

## Modules (architecture)

The project decomposes into four modules. Scope per module is in [In scope](#in-scope-v0) below.

- ❶ **AUTHORING** — the forward path. The DSL's primitives, combinators, and theme system. Code: `src/frame.ts`, `src/theme.ts`, `src/jsx.tsx`. Output: SVG.
- ❷ **DECODER** — the inverse path. SVG → `recognize` → `emitDsl` → `renderRecognized`. Validates that AUTHORING's vocabulary actually covers real-world SVG. Code: `src/decode.tsx`.
- ❸ **SPEC** — the language definition Claude reads as a system prompt or skill instruction. The "user manual" of the DSL. *Not yet written.*
- ❹ **INTEGRATION** — Claude Code skill + CLI command. How a developer reaches vectx through Claude. *Not yet written.*

Orthogonal in-scope items (cross-cutting, not module-bound): fixtures + tests, the `web/` showcase, name reservations on npm + crates.io.

---

## In scope (v0)

The following work units are included in v0, grouped by module. Anything else is out of scope until v0 is closed.

### ❶ AUTHORING — forward path

- **DSL TS lib** — Frame / primitives / grids / boolean ops (`src/frame.ts`). API surface frozen for v0.
- **Theme system** (`src/theme.ts`) — TokenRef / composeThemes / applyTheme. Frozen for v0.
- **SVG forward compile target** — the only compile target in v0.

### ❷ DECODER — inverse path

- **Inverse decoder** (`src/decode.tsx`) — SVG → vectx DSL. The validation surface; frozen for v0.
- **Test suite** — fixtures-based unit tests (currently 5) **plus** at least one cold-LLM e2e test where Claude writes vectx through the spec and the output renders.

### ❸ SPEC — language definition

- **DSL spec doc** — written *for Claude*, intended to be loaded as system prompt / skill instruction.

### ❹ INTEGRATION — entry points

- **CLI entry** — `vectx render <file>` (or equivalent) that compiles vectx code to SVG. Distributed alongside the lib.
- **Claude skill entry** — `~/.claude/skills/vectx/` package so Claude Code auto-discovers and uses vectx without prompting setup.

### Orthogonal — not module-bound

- **Web showcase** (`web/`) — landing + interactive decoder demo. Visible thesis demonstration + human sanity check. **Not** an end-user IDE or code editor.
- **Name reservation on npm and crates.io** — stub `0.0.0` placeholders that lock the `vectx` name on both registries. No functional release; consumers still install from git. Stub sources live under `publish-stubs/`.

---

## Out of scope (v0 — explicit non-goals)

These are deliberately not done in v0. Do not add them to v0 without going through [Re-open conditions](#re-open-conditions).

- **Other AI coding tools**: Cursor, Copilot, Cline, Aider, Continue, Roo, Windsurf, generic VS Code extensions — no adapters, no support paths. v0 is Claude-first by design.
- **Other LLM providers**: GPT / Gemini / Llama / open-source models — no spec tuning, no benchmark fixtures, no compatibility work. The spec gets to use whatever Claude is best at.
- **Generic MCP / multi-client integration** — only the Claude Code/CLI integration ships. MCP server form is not in v0.
- **Other compile targets** — Canvas, PDF, DXF, G-code, JSON IR, DST embroidery. All v1+.
- **Designer-facing tooling** — GUI editor, web playground for end users, Figma plugin, Adobe extension.
- **npm / crates.io functional release** — only the `0.0.0` stub name-reservation packages ship in v0. No public version-number commitments while spec is still moving; consumers install via git URL.
- **SVG fidelity features** — gradients, clipPath, filter, transform flatten, faithful pixel round-trip. AI reasoning doesn't need them; compile-target layer (v1+) can handle them if ever needed.
- **External collaborator recruiting** — no outreach, no "give us feedback" campaigns in v0.
- **Business model decisions** — license stays MIT, no SaaS, no dual-license, no paid tier work.
- **Cross-domain demos** (logo / game asset / print) — README pitches them as the eventual reach, but v0 ships with the 5 existing Wikipedia-style fixtures only.

---

## Glossary

Terms that have project-specific meaning beyond plain English. Keep entries terse. Add a term the moment it picks up project-specific meaning.

### DSL vocabulary

- **DSL** — domain-specific language; a small language designed for one domain. vectx is a DSL for describing vector graphics, as opposed to general-purpose languages like TypeScript or Rust.
- **embedded DSL** — a DSL hosted inside another language's syntax. vectx today is embedded in TypeScript (`Frame()`, `Circle()`, `grid()` are TS function calls), not parsed as a standalone text format.
- **forward path** — writing vectx → rendering SVG. Owned by ❶ AUTHORING.
- **inverse path** — taking existing SVG → recovering vectx that would produce an equivalent rendering. Owned by ❷ DECODER.
- **round-trip** — `svg → recognize(svg) → emitDsl(rec) → render(rec)` — three boundaries, four artifacts. The proof that the language is expressive enough to describe what it sees.
- **compile target** — what vectx renders into. v0: only SVG. Out of scope: Canvas, PDF, DXF, G-code, JSON IR, DST embroidery, etc.
- **recognize / emitDsl / renderRecognized** — the three functions inside ❷ DECODER. `recognize(svg) → Recognized`, `emitDsl(rec) → string`, `renderRecognized(rec) → ReactNode[]`.
- **fixture** — one of the SVGs in `fixtures/` we test the decoder against (currently 5: `congress`, `standard-model`, `tiger`, `firefox`, `inkscape`). Each carries a `failureNote` describing what should or shouldn't round-trip.

### Roles & audience

- **primary author** — Claude (Anthropic's family). vectx is tuned for Claude's strengths and weaknesses, not for a generic LLM.
- **primary consumer** — a developer reaching vectx through Claude Code or the Claude CLI. They typically do *not* hand-write vectx; Claude does.
- **end user** — eventually, the human who looks at the rendered SVG somewhere downstream. v0 does not optimize their experience directly; that's whoever ships the output's job.

### Process

- **stub / name reservation** — 0.0.0 placeholder packages on npm + crates.io that lock the `vectx` / `vectx-wasm` names without shipping functional code. Sources in `publish-stubs/`.
- **alpha / v0** — current phase. Pre-SPEC, pre-skill, pre-CLI. Versions written as `0.0.x`. Anything can change.
- **anti-rot** — CI check that fails when documentation references in this file no longer match the repo (paths, function names, fixture list). See `.github/workflows/check.yml` + `.github/scripts/anti-rot.ts`.

---

## Re-open conditions

This boundary is frozen. The following are the only valid reasons to re-open negotiation on what v0 includes:

1. A real Claude Code user produces a vectx asset and ships it to an end user, and the feedback loop runs ≥ 1 month.
2. The cold-LLM e2e test stabilizes and can be run as a batch (multiple prompts, reproducible).
3. The project owner explicitly decides to open a second LLM, second compile target, or second client surface.
4. A v0 in-scope item turns out to be impossible or load-bearing-blocked, requiring scope renegotiation.

Scope changes land in a `boundary:`-prefixed commit explaining which clause moved and why.
