/**
 * Lab registry — pure React, not folder-watched.
 *
 * Labs are first-class webapp components, not markdown files in
 * .claude/. Reason: lab content iterates fast (the whole point of a
 * workshop), and shipping it through Vite's `?raw` glob would add
 * ceremony for every tweak. Drop a new Lab entry here, point it at a
 * Content component, done.
 *
 * When a lab matures, its findings *graduate* (see BOUNDARY glossary)
 * — code lands in src/, the lab note migrates to .claude/researches/
 * as a frozen design record, and the registry entry is removed.
 */

import type { ComponentType } from 'react'

import { GrammarLab } from './grammar'

export type Lab = {
  id: string
  title: string
  date: string
  status: string
  lede: string
  Content: ComponentType
}

export const LABS: Lab[] = [
  {
    id: 'grammar',
    title: 'Grammar — vectx surface, side by side',
    date: '2026-05-18',
    status: 'active · pre-AUTHORING-freeze audit',
    lede:
      'The same shape, the same render, two writing surfaces. Left column: current SVG-ish vectx. Right column: proposed math/physics-aligned form. Read down each column for the dialect; read across rows for the trade-off.',
    Content: GrammarLab,
  },
]
