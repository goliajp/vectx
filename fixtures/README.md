# Fixtures

Real-world SVG inputs used to validate the decoder. Each one exercises a
different combination of semantic signals and structural failure modes.

| File | Source | License | Bytes | What it stress-tests |
|---|---|---|---|---|
| `congress.svg` | Wikimedia · 117th U.S. Congress House districts (blank) | Public domain | 2.5 MB | 436 paths with `id="STATE-NN"` labels → semantic intent via ids; style dedup |
| `tiger.svg` | Adobe PostScript distribution · Ghostscript Tiger | Public domain | 67 KB | 240 paths inside 241 `<g>` wrappers · style inherited from parent group |
| `firefox.svg` | Mozilla brand · Wikimedia (trademark, fair use) | Trademark | 10 KB | 12 paths all `fill="url(#…)"` → 12 gradient defs unresolved |
| `inkscape.svg` | Inkscape brand · Wikimedia (trademark, fair use) | Trademark | 23 KB | every failure mode: 25 transforms, gradients, clipPath, filter, use elements |
| `standard-model.svg` | Wikimedia · Standard Model of Elementary Particles | CC BY-SA | 38 KB | 385 `<text>` elements + 28 `<desc>` elements, 9 languages → semantic intent via doc metadata |

For decoder validation runs, use `bun test` or `bun run dev` and view in
the demo page.

These are real-world inputs chosen for **stress diversity**, not for
visual fidelity proof. The intent-recovery thesis is tested by reading
the emitted DSL cold and seeing if you can identify what the source is
about — see project README for the two passing unit tests.
