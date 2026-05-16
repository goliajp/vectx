# vectx v0 Boundary

> Frozen on 2026-05-16. This file is the scope contract for v0.
> To re-open, see [Re-open conditions](#re-open-conditions) at the bottom.
> Do not edit casually. Edits require an explicit commit message tagged `boundary:`.

---

## Thesis (L1, one line)

vectx is the descriptive language between AI and the vector world. **AI is the primary author** — every spec, error message, and ergonomics choice is downstream of that.

## Primary author / consumer (v0)

- **PRIMARY AUTHOR**: Claude — specifically Anthropic's Claude family. The DSL is tuned for Claude's strengths and weaknesses, not for a generic LLM.
- **PRIMARY CONSUMER**: people using Claude via **Claude Code** or the **Claude CLI**. The canonical use path in v0 is:
  > User asks Claude to make a vector asset → Claude writes vectx code in a Claude Code / CLI session → vectx renders or compiles it to SVG.
- Other Claude surfaces (Claude API direct calls, claude.ai web chat) are **not blocked** but are **not tuned for** in v0. They work to the extent that Code/CLI paths work.
- This is **not** a designer-facing tool. There is no GUI use case in v0.

## In scope (v0)

The following work units are included in v0. Anything else is out of scope until v0 is closed.

- **DSL TS lib** — Frame / primitives / grids / boolean ops (`src/frame.ts`). API surface frozen for v0.
- **Theme system** (`src/theme.ts`) — TokenRef / composeThemes / applyTheme. Frozen for v0.
- **Inverse decoder** (`src/decode.tsx`) — SVG → vectx DSL. The validation surface; frozen for v0.
- **SVG forward compile target** — the only compile target in v0.
- **DSL spec doc** — written *for Claude*, intended to be loaded as system prompt / skill instruction.
- **Test suite** — fixtures-based unit tests (currently 5) **plus** at least one cold-LLM e2e test where Claude writes vectx through the spec and the output renders.
- **CLI entry** — `vectx render <file>` (or equivalent) that compiles vectx code to SVG. Distributed alongside the lib.
- **Claude skill entry** — `~/.claude/skills/vectx/` package so Claude Code auto-discovers and uses vectx without prompting setup.
- **Web showcase** (`web/`) — landing + interactive decoder demo. Visible thesis demonstration + human sanity check. **Not** an end-user IDE or code editor.
- **Name reservation on npm and crates.io** — stub `0.0.0` placeholders that lock the `vectx` name on both registries. No functional release; consumers still install from git. Stub sources live under `publish-stubs/`.

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

## Re-open conditions

This boundary is frozen. The following are the only valid reasons to re-open negotiation on what v0 includes:

1. A real Claude Code user produces a vectx asset and ships it to an end user, and the feedback loop runs ≥ 1 month.
2. The cold-LLM e2e test stabilizes and can be run as a batch (multiple prompts, reproducible).
3. The project owner explicitly decides to open a second LLM, second compile target, or second client surface.
4. A v0 in-scope item turns out to be impossible or load-bearing-blocked, requiring scope renegotiation.

**Change process**: edits to this file must land in a commit whose message starts with `boundary:` and explains which clause moved and why. No silent edits.
