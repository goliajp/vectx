/**
 * theme — token references + theme composition for the geometry DSL.
 *
 * Design contract (v0):
 * - Token is a typed reference with optional fallback. Themes are additive
 *   contributions, NOT contracts — a missing token falls back to its own
 *   declared default. Render never breaks because of a missing theme key.
 * - Tokenable<T> = T | TokenRef<T>. Tokens may appear anywhere a concrete
 *   T is accepted, transparently. v0 supports tokens only in Style fields;
 *   geometry tokens (r, padding, at) are deliberately deferred — they
 *   entangle with layout solving (Phase 2).
 * - Theme = flat Record<string, unknown> with dot-namespaced keys
 *   ('seal.red', 'district.border', etc). Untyped on purpose for LLM
 *   ergonomics; a strict-schema layer can be added later without breaking
 *   existing themes.
 * - composeThemes is right-wins object spread — associative, commutative
 *   only when key sets are disjoint, has an identity (empty theme).
 *   themes-of-themes compose just like single themes.
 * - applyTheme is EAGER: returns a fully-resolved record with no token
 *   references remaining. Render layers see only concrete values. No
 *   render-time "active theme context" magic; theme switching = re-render
 *   with a different composed theme.
 *
 * Mental model: token references are placeholders. A theme is a partial
 * function from placeholder name to concrete value. applyTheme is the
 * application of that function across a record. Spec author writes once;
 * theme author parameterizes; compile produces N visual variants.
 */

/** A typed reference to a theme-provided value. */
export type TokenRef<T> = {
  readonly __isToken: true
  readonly name: string
  /** Used when no theme defines this token. Keeps render safe even with no theme bound. */
  readonly fallback?: T
}

/**
 * Construct a token reference. The phantom type parameter T propagates
 * what kind of value this token resolves to — useful so a token meant
 * for `fill` (string) can't accidentally be passed where strokeWidth
 * (number) is expected.
 */
export function token<T>(name: string, fallback?: T): TokenRef<T> {
  return { __isToken: true, name, fallback }
}

export function isToken(v: unknown): v is TokenRef<unknown> {
  return typeof v === 'object' && v !== null && (v as { __isToken?: boolean }).__isToken === true
}

/** Any field that accepts a concrete value or a token reference. */
export type Tokenable<T> = T | TokenRef<T>

/**
 * A theme binds token names to concrete values. Flat structure, dot-
 * namespaced keys, values can be primitives or full Style objects
 * (bundle tokens — the Illustrator Graphic Style equivalent).
 */
export type Theme = Readonly<Record<string, unknown>>

/**
 * Compose any number of themes into one. Right wins: later themes
 * override earlier ones for the same key. Associative:
 *   compose(compose(a, b), c) === compose(a, compose(b, c))
 * Identity is the empty theme: compose({}, t) === t.
 *
 * Composability is the whole point — a base theme + brand override +
 * dark-mode override compose left-to-right naturally.
 */
export function composeThemes(...themes: Theme[]): Theme {
  return Object.assign({}, ...themes)
}

/**
 * Resolve a Tokenable<T> against a theme.
 * - concrete value → returned as-is
 * - token + theme has the name → theme value
 * - token + theme misses → token's own fallback
 * - token + nothing anywhere → undefined
 */
export function resolve<T>(v: Tokenable<T> | undefined, theme: Theme): T | undefined {
  if (v === undefined) return undefined
  if (!isToken(v)) return v as T
  const bound = theme[v.name]
  if (bound !== undefined) return bound as T
  return v.fallback
}

/**
 * Apply a theme to a record whose fields are each Tokenable<value>.
 * Returns a fully-resolved version with NO token references.
 *
 * Two input shapes are supported:
 *   - a record `{ fill: Tokenable<string>, … }` — per-field resolution
 *   - a TokenRef<Record> — the whole record IS a bundle token, resolved first
 *
 * Bundle + per-field overlay is intentionally NOT supported in v0
 * (would require its own merge operator). If needed, compose the bundle
 * theme entry to be the merged record.
 */
export function applyTheme<S extends Record<string, unknown>>(
  s: { [K in keyof S]?: Tokenable<S[K]> } | TokenRef<S> | undefined,
  theme: Theme
): S {
  if (s === undefined) return {} as S
  if (isToken(s)) {
    const bundle = resolve(s as TokenRef<S>, theme)
    return (bundle ?? ({} as S)) as S
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(s) as Array<keyof S>) {
    const v = (s as Record<string, Tokenable<unknown>>)[k as string] as Tokenable<S[keyof S]>
    const r = resolve(v, theme)
    if (r !== undefined) out[k as string] = r
  }
  return out as S
}
