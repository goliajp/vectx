# vectx v0

> Frozen on 2026-05-16, restructured 2026-05-18 to a four-module
> decomposition (AUTHORING / RENDERER / IMPORTER / INTEGRATION) plus
> a normalized-IR architecture pattern. One file, seven sections.
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

## Architecture pattern

vectx follows the **normalized internal representation + edge adapters** pattern. The same pattern shows up across software:

| domain                  | library / tool             | normalized IR             |
|-------------------------|----------------------------|---------------------------|
| time                    | dayjs / Luxon / Temporal   | `Dayjs` / `DateTime`      |
| documents               | Pandoc                     | Pandoc native AST         |
| media                   | FFmpeg                     | AVFrame / packet pipeline |
| compilation             | LLVM                       | LLVM IR                   |
| javascript AST          | Babel                      | ESTree                    |
| **vector graphics**     | **vectx**                  | **vectx tree**            |

The library's value lives in the IR; the I/O adapters are how it earns its keep. For vectx specifically:

- **❶ AUTHORING** owns the IR. The pleasure of writing into it is the moat.
- **❷ RENDERER** is the *IR → output* port; future Canvas / PDF / DXF / glTF are sibling render plugins.
- **❸ IMPORTER** is the *input → IR* port; future DXF / PDF / AI parsers are sibling import plugins.
- **❹ INTEGRATION** is the module unique to vectx-as-an-AI-DSL: how the IR's author (Claude) gets access. dayjs needs no such thing because its user is a human reading the npm README; vectx's user is Claude, and the spec doc + skill + CLI are how Claude learns and reaches the IR.

The **round-trip** — `source-svg → IMPORTER → vectx → RENDERER → reconstructed-svg` — is the continuous integrity test that the IR is expressive enough to describe what it sees. Most normalized-IR systems eventually converge on this same proof.

---

## Where vectx diverges from those precedents

The structural shape — normalized IR + edge adapters — is the same. The **purpose** is not. FFmpeg / Pandoc / LLVM / Babel are *transcoders*: they translate existing artifacts between formats. vectx is a *creation* tool: the IR is the medium where Claude writes vector assets that didn't exist before. Three consequences follow:

- **The forward path is primary.** AUTHORING + RENDERER is the main event. Claude writing into the IR is the act of value creation; the rest is support.

- **IMPORTER is secondary, and allowed to be lossy when it conflicts with AUTHORING.** The round-trip is not lossless and need not be. The Out of scope list below pre-encodes which SVG features are off the AUTHORING table — gradients, clipPath, filter, transform-flatten, faithful pixel round-trip. For an SVG that uses them, IMPORTER's options are: ignore the feature and import the rest (lossy partial), refuse the file, or simply not have been written yet. Today most fail cases fall in that third bucket — "not yet implemented" is the dominant status, *not* "deliberately rejected forever". Either way the language itself doesn't owe these features preservation. IMPORTER's three sources of value are (a) round-trip validating the IR is expressive enough, (b) bootstrapping Claude with existing SVG as examples, (c) migrating prior work for users coming from elsewhere — none of these are why the project exists.

- **The IR's design target is cognitive ergonomics for an LLM author**, not fidelity to existing data. Token density, compositional predictability, and forgiveness of partial knowledge dominate over preservation completeness.

Two precedents capture different halves of this. **dayjs** is the closest cousin for the *manipulation surface* — its `Dayjs` objects are created and edited, not merely transcoded. **Markdown** is the closest cousin for the *language asymmetry with the world* — Markdown is deliberately a smaller language than HTML, Markdown → HTML is comprehensive, HTML → Markdown is lossy by design, and nobody calls that a defect. **vectx is to SVG what Markdown is to HTML**: a new, smaller, AI-friendlier format that does *not* try to be a superset of what it converts into. The lossy importer is the price; an LLM-shaped vocabulary is the prize.

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

- ❶ **AUTHORING** — the IR vocabulary. vectx's primitives, combinators, and theme system. Code: `src/frame.ts`, `src/theme.ts`, `src/jsx.tsx`. Output: a vectx tree.
- ❷ **RENDERER** — IR → output port. Turns a vectx tree into a renderable format. v0: SVG only. Sibling render targets (Canvas / PDF / DXF / …) live here in v1+. Currently entangled with AUTHORING in `src/frame.ts`; conceptual split now, code split is a v1 refactor.
- ❸ **IMPORTER** — input → IR port. Takes an external vector format (today: SVG) and recovers a vectx tree. Code: `src/decode.tsx` (`parseSvg` / `recognize` / `emitDsl`, plus `renderRecognized` which calls into RENDERER for round-trip verification). Sibling importers (DXF / PDF / AI / …) live here in v1+.
- ❹ **INTEGRATION** — everything LLM-facing. The spec doc Claude reads, the Claude Code skill package, and the CLI. Without this module, the IR exists but Claude can't reach it. *Spec doc + skill + CLI not yet written.*

Orthogonal in-scope items (cross-cutting, not module-bound): fixtures + tests, the `web/` showcase, name reservations on npm + crates.io.

---

## In scope (v0)

The following work units are included in v0, grouped by module. Anything else is out of scope until v0 is closed.

### ❶ AUTHORING — the IR

- **DSL TS lib** — Frame / primitives / grids / boolean ops (`src/frame.ts`). API surface frozen for v0.
- **Theme system** (`src/theme.ts`) — TokenRef / composeThemes / applyTheme. Frozen for v0.

### ❷ RENDERER — IR → output

- **SVG render** — vectx tree → SVG. The only output format in v0. Currently inlined in `src/frame.ts` and `src/jsx.tsx` (React JSX); conceptual split from AUTHORING now, code split is a v1 refactor.

### ❸ IMPORTER — input → IR

- **SVG importer** (`src/decode.tsx`) — SVG → vectx tree. The validation surface; frozen for v0.
- **Test suite** — fixtures-based unit tests (currently 5) **plus** at least one cold-LLM e2e test where Claude writes vectx through the spec and the output renders.

### ❹ INTEGRATION — LLM-facing

- **Spec document** — written *for Claude*, intended to be loaded as system prompt / skill instruction. Defines the IR vocabulary in a form an LLM can compress and recall.
- **Claude skill entry** — `~/.claude/skills/vectx/` package that bundles the spec + call shim, so Claude Code auto-discovers and uses vectx.
- **CLI entry** — `vectx render <file>` (or equivalent). Same vocabulary, shell-distributed; fallback / validation path.

### Orthogonal — not module-bound

- **Web showcase** (`web/`) — landing + interactive importer demo. Visible thesis demonstration + human sanity check. **Not** an end-user IDE or code editor.
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
- **IR** / **vectx tree** — the in-memory normalized representation a vectx program reduces to. The shared substrate that ❶ AUTHORING produces, ❷ RENDERER consumes, and ❸ IMPORTER reconstructs.
- **forward path** — writing vectx → vectx tree → output format. Spans ❶ AUTHORING + ❷ RENDERER.
- **inverse path** — taking an external vector format → vectx tree. Owned by ❸ IMPORTER.
- **round-trip** — `source-svg → IMPORTER → vectx tree → RENDERER → reconstructed-svg` — the proof that the IR is expressive enough to describe what it sees.
- **compile target** / **render target** — output format that ❷ RENDERER produces. v0: SVG only. Out of scope: Canvas, PDF, DXF, G-code, JSON IR, DST embroidery, etc. Each future target is a sibling plugin under RENDERER.
- **import format** — external vector format that ❸ IMPORTER consumes. v0: SVG only. v1+: DXF, PDF, AI, EPS — siblings under IMPORTER.
- **recognize / emitDsl / renderRecognized** — the three functions inside ❸ IMPORTER. `recognize(svg) → Recognized`, `emitDsl(rec) → string`, `renderRecognized(rec) → ReactNode[]` (the last one borrows ❷ RENDERER to draw the recognized tree back as SVG).
- **fixture** — one of the SVGs in `fixtures/` we test the decoder against (currently 5: `congress`, `standard-model`, `tiger`, `firefox`, `inkscape`). Each carries a `failureNote` describing what should or shouldn't round-trip.

### Roles & audience

- **primary author** — Claude (Anthropic's family). vectx is tuned for Claude's strengths and weaknesses, not for a generic LLM.
- **primary consumer** — a developer reaching vectx through Claude Code or the Claude CLI. They typically do *not* hand-write vectx; Claude does.
- **end user** — eventually, the human who looks at the rendered SVG somewhere downstream. v0 does not optimize their experience directly; that's whoever ships the output's job.

### Process

- **stub / name reservation** — 0.0.0 placeholder packages on npm + crates.io that lock the `vectx` / `vectx-wasm` names without shipping functional code. Sources in `publish-stubs/`.
- **alpha / v0** — current phase. Pre-SPEC, pre-skill, pre-CLI. Versions written as `0.0.x`. Anything can change.
- **anti-rot** — CI check that fails when documentation references in this file no longer match the repo (paths, function names, fixture list). See `.github/workflows/check.yml` + `.github/scripts/anti-rot.ts`.
- **research / playground** — exploration space under `.claude/researches/topic/<id>/` (a `README.md`, optionally a `playground.html`). Notes are frozen-by-date snapshots of design conversations; they're outside anti-rot's authority and don't carry scope commitments. The web Research view renders them inline.
- **graduate** — the workflow by which a research thread becomes module work: a topic matures (open questions resolved, audit done, playground stabilized or judged unnecessary), then **graduates** — code lands in `src/`, BOUNDARY updates as needed via a `boundary:` commit. The research note stays as the frozen design conversation; future readers see how the decision evolved.

---

## Re-open conditions

This boundary is frozen. The following are the only valid reasons to re-open negotiation on what v0 includes:

1. A real Claude Code user produces a vectx asset and ships it to an end user, and the feedback loop runs ≥ 1 month.
2. The cold-LLM e2e test stabilizes and can be run as a batch (multiple prompts, reproducible).
3. The project owner explicitly decides to open a second LLM, second compile target, or second client surface.
4. A v0 in-scope item turns out to be impossible or load-bearing-blocked, requiring scope renegotiation.

Scope changes land in a `boundary:`-prefixed commit explaining which clause moved and why.
