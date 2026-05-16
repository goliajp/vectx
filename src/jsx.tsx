/**
 * Geometry → JSX render helpers.
 *
 * The core `geometry/index.ts` module is pure TypeScript — it describes
 * shapes and computes SVG-string fragments, but never emits JSX. That keeps
 * it usable from non-React contexts and from tests.
 *
 * This file is the React-aware compile target. Helpers here close over the
 * DSL's shape objects and produce SVG JSX directly — especially the cases
 * that need React composition (clipPath, mask, filter).
 */

import { useId, type ReactNode } from 'react'

import { Circle, Ellipse, Rect } from './frame'

/**
 * Clip children to lie inside a Circle/Ellipse/Rect. Anything that escapes
 * the shape is hidden — the SVG equivalent of `overflow: hidden`.
 *
 * Use case: a grid of cells inside the inner ring of a 双环 seal. The
 * outer corners of the grid would otherwise poke through the ring. Wrap
 * them in `<ClipInside shape={innerRing}>...</ClipInside>` and they're
 * trimmed at the ring boundary.
 *
 * Generates a unique clipPath id via React.useId so multiple instances
 * don't collide. The `:` in useId() output is replaced with `_` for
 * SVG url(#…) compatibility on older browsers.
 */
export function ClipInside({
  shape,
  children,
}: {
  shape: Circle | Ellipse | Rect
  children: ReactNode
}) {
  const rawId = useId()
  const id = `clip-${rawId.replace(/:/g, '_')}`
  let clipEl: ReactNode
  if (shape instanceof Circle) {
    clipEl = <circle {...shape.toSvgAttrs()} />
  } else if (shape instanceof Ellipse) {
    clipEl = <ellipse {...shape.toSvgAttrs()} />
  } else {
    clipEl = <rect {...shape.toSvgAttrs()} />
  }
  return (
    <>
      <defs>
        <clipPath id={id}>{clipEl}</clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  )
}
