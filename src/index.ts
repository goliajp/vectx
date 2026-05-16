/**
 * vectx — descriptive language for AI-generated vector graphics.
 *
 * Public surface. AI is the first-class authoring user; this module
 * exposes the minimum set of primitives the AI needs to express any
 * vector intent + the inverse pipeline that lets AI read any existing
 * vector input. Compile targets (SVG today; Canvas/PDF/DXF/G-code
 * tomorrow) live under different render layers.
 */

/* ─── Forward direction · authoring ───────────────────────────────── */

// Coordinate system + primitives
export {
  Frame,
  Circle,
  Arc,
  Ellipse,
  Rect,
  Polygon,
  Line,
  Path,
  type Point,
  type Style,
} from './frame'

// Theme system (tokens + compose-algebra)
export {
  token,
  isToken,
  composeThemes,
  resolve,
  applyTheme,
  type TokenRef,
  type Tokenable,
  type Theme,
} from './theme'

// React render helpers (peer-dep on React; optional)
export { ClipInside } from './jsx'

/* ─── Inverse direction · decoding ────────────────────────────────── */

export {
  parseSvg,
  recognize,
  emitDsl,
  estimateEmitBytes,
  renderRecognized,
  type RawShape,
  type RawStyle,
  type RawStyleTokenable,
  type TextStyle,
  type Semantics,
  type DocSemantics,
  type Recognized,
  type RecognizedPrim,
  type RecognizedGroup,
} from './decode'
