export type Fixture = {
  id: string
  label: string
  url: string
  failureNote: string
}

export const FIXTURES: Fixture[] = [
  {
    id: 'congress',
    label: '117th U.S. Congress · districts',
    url: '/congress.svg',
    failureNote: '✓ semantic via id labels (435 districts as STATE-NN)',
  },
  {
    id: 'standard-model',
    label: 'Standard Model · particle physics',
    url: '/standard-model.svg',
    failureNote: '✓ semantic via <text> + <desc> (281 unique strings, 9 languages)',
  },
  {
    id: 'tiger',
    label: 'Ghostscript Tiger',
    url: '/tiger.svg',
    failureNote: '⚠ style on parent <g> — group inheritance Phase 1',
  },
  {
    id: 'firefox',
    label: 'Firefox logo · gradients',
    url: '/firefox.svg',
    failureNote: '✗ <defs> gradients unresolved — out-of-scope for v0',
  },
  {
    id: 'inkscape',
    label: 'Inkscape logo · every failure',
    url: '/inkscape.svg',
    failureNote: '✗ transforms + gradients + clipPath + filter',
  },
]
