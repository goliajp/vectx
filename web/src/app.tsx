import { useCallback, useEffect, useState } from 'react'

import { DecoderPanel } from './components/decoder-panel'
import { FIXTURES, type Fixture } from './fixtures'
import { LabSection } from './lab/lab-section'
import { ResearchSection } from './research/research-section'

const SEP = '·'
const REPO_URL = 'https://github.com/goliajp/vectx'

type View = 'home' | 'authoring' | 'renderer' | 'importer' | 'integration' | 'lab' | 'research'

type NavItem = {
  id: View
  label: string
  ready: boolean
}

// HOME is reached by clicking the brand (top-left); not listed in the nav.
// Module order matches BOUNDARY's ❶❷❸❹; LAB + RESEARCH appended as
// orthogonal (LAB active workshop, RESEARCH frozen design notes).
const NAV_ITEMS: NavItem[] = [
  { id: 'authoring', label: 'AUTHORING', ready: false },
  { id: 'renderer', label: 'RENDERER', ready: false },
  { id: 'importer', label: 'IMPORTER', ready: true },
  { id: 'integration', label: 'INTEGRATION', ready: false },
  { id: 'lab', label: 'LAB', ready: true },
  { id: 'research', label: 'RESEARCH', ready: true },
]

const VIEW_IDS = new Set<View>(['home', ...NAV_ITEMS.map((n) => n.id)])

function parseHashView(): View {
  if (typeof window === 'undefined') return 'home'
  const raw = window.location.hash.replace(/^#/, '')
  // Back-compat: #decoder still routes to importer.
  const h = raw === 'decoder' ? 'importer' : raw
  return VIEW_IDS.has(h as View) ? (h as View) : 'home'
}

function useHashView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(parseHashView)
  useEffect(() => {
    const onHashChange = () => setView(parseHashView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const set = useCallback((v: View) => {
    const next = v === 'home' ? '' : `#${v}`
    if (window.location.hash !== next) {
      window.history.pushState(null, '', next || window.location.pathname)
      setView(v)
    }
  }, [])
  return [view, set]
}

export function App() {
  const [view, setView] = useHashView()
  const [activeId, setActiveId] = useState(FIXTURES[0]!.id)
  const active = FIXTURES.find((f) => f.id === activeId)!

  return (
    <>
      <TopBar active={view} set={setView} />
      <main className="vx-main">
        {view === 'home' && <Hero set={setView} />}
        {view === 'importer' && (
          <Importer activeId={activeId} setActiveId={setActiveId} active={active} />
        )}
        {view === 'lab' && <LabSection />}
        {view === 'research' && <ResearchSection />}
        {(view === 'authoring' || view === 'renderer' || view === 'integration') && (
          <Placeholder id={view} />
        )}
      </main>
      <BottomBar />
    </>
  )
}

function TopBar({ active, set }: { active: View; set: (v: View) => void }) {
  return (
    <header className="vx-topbar">
      <button
        type="button"
        onClick={() => set('home')}
        className="vx-brand mono"
        aria-label="vectx home"
        aria-current={active === 'home' ? 'page' : undefined}
      >
        <span className="vx-brand-house">GOLIA</span>
        <span className="vx-brand-slash">/</span>
        <span className="vx-brand-mark">VECTX</span>
      </button>
      <nav className="vx-topnav" aria-label="main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          if (!item.ready) {
            return (
              <span
                key={item.id}
                className="mono vx-navlink vx-navlink-soon"
                title="not yet written"
                aria-disabled
              >
                <span>{item.label}</span>
                <span className="vx-navlink-tag">SOON</span>
              </span>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => set(item.id)}
              className={`mono vx-navlink${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
      <a
        className="mono vx-topbar-link"
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        GITHUB ↗
      </a>
    </header>
  )
}

function Hero({ set }: { set: (v: View) => void }) {
  return (
    <section className="vx-hero">
      <p className="mono vx-eyebrow">VECTX {SEP} ALPHA {SEP} v0.0.1</p>
      <h1 className="vx-h1">vectx</h1>
      <p className="vx-thesis">The descriptive language between AI and the vector world.</p>
      <p className="vx-sub">
        AI is the primary author. Reached through Claude Code or the Claude CLI. The site
        is split by module — pick from the navigation above. Importer shows the round-trip
        on real-world SVGs; Research collects exploration notes and live playgrounds;
        Authoring / Renderer / Integration are scoped in BOUNDARY but not yet written.
      </p>
      <div className="vx-cta-row">
        <button
          type="button"
          className="mono vx-cta-pill"
          onClick={() => set('importer')}
        >
          OPEN THE IMPORTER →
        </button>
        <button
          type="button"
          className="mono vx-cta-link"
          onClick={() => set('research')}
        >
          READ RESEARCH →
        </button>
        <a
          className="mono vx-cta-link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          GITHUB.COM/GOLIAJP/VECTX ↗
        </a>
      </div>
    </section>
  )
}

function Importer({
  activeId,
  setActiveId,
  active,
}: {
  activeId: string
  setActiveId: (id: string) => void
  active: Fixture
}) {
  return (
    <section className="vx-demo">
      <header className="vx-demo-head">
        <h2 className="mono vx-demo-title">IMPORTER {SEP} SVG → VECTX → SVG</h2>
        <p className="mono vx-demo-sub">FIVE FIXTURES {SEP} DECODED IN-BROWSER {SEP} NO SERVER</p>
      </header>
      <FixturePicker activeId={activeId} setActiveId={setActiveId} />
      <ActiveNote active={active} />
      <DecoderPanel url={active.url} />
    </section>
  )
}

function FixturePicker({
  activeId,
  setActiveId,
}: {
  activeId: string
  setActiveId: (id: string) => void
}) {
  return (
    <nav className="vx-fixtures" aria-label="fixture picker">
      {FIXTURES.map((f, i) => {
        const isActive = f.id === activeId
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveId(f.id)}
            className={`vx-fixture${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
          >
            <span className="mono vx-fix-idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="mono vx-fix-id">{f.id}</span>
            <span className="vx-fix-label">{f.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function ActiveNote({ active }: { active: Fixture }) {
  const note = active.failureNote
  const status: 'pass' | 'partial' | 'fail' = note.startsWith('✓')
    ? 'pass'
    : note.startsWith('⚠')
      ? 'partial'
      : 'fail'
  const stripped = note.replace(/^[✓⚠✗]\s*/, '')
  const statusLabel =
    status === 'pass' ? 'WITHIN SCOPE' : status === 'partial' ? 'PHASE 1 GAP' : 'NOT YET IMPORTED'
  const noteColor =
    status === 'pass'
      ? 'var(--status-pass)'
      : status === 'partial'
        ? 'var(--status-warn)'
        : 'var(--status-fail)'

  return (
    <div className="vx-note" style={{ '--note-c': noteColor } as React.CSSProperties}>
      <div className="vx-note-body">
        <div className="mono vx-note-status">{statusLabel}</div>
        <h3 className="vx-note-title">{active.label}</h3>
        <p className="vx-note-sub">{stripped}</p>
      </div>
      <div className="mono vx-note-id">/{active.id}.svg</div>
    </div>
  )
}

const PLACEHOLDER_META: Record<string, { title: string; description: string }> = {
  authoring: {
    title: 'Authoring',
    description:
      'The IR vocabulary — primitives (Frame · Circle · Path · grid), boolean ops, and the theme system. Code lives at src/frame.ts and src/theme.ts. This is what Claude writes vectx as. A dedicated page is on the BOUNDARY list but not yet written.',
  },
  renderer: {
    title: 'Renderer',
    description:
      'IR → output port. Turns a vectx tree into a renderable format (v0: SVG only). Currently inlined inside Authoring (src/frame.ts + src/jsx.tsx); conceptual split now, code split is a v1 refactor. Future Canvas / PDF / DXF render targets are sibling plugins.',
  },
  integration: {
    title: 'Integration',
    description:
      'The LLM-facing module: the spec document Claude reads, the Claude Code skill package that bundles it, and the CLI fallback path. Without this module the IR exists but Claude can\'t reach it. None of the three are written yet.',
  },
}

function Placeholder({ id }: { id: 'authoring' | 'renderer' | 'integration' }) {
  const meta = PLACEHOLDER_META[id]
  if (!meta) return null
  return (
    <section className="vx-placeholder">
      <p className="mono vx-placeholder-tag">
        MODULE {SEP} {id.toUpperCase()} {SEP} <span className="vx-placeholder-soon">SOON</span>
      </p>
      <h2 className="vx-placeholder-title">{meta.title}</h2>
      <p className="vx-placeholder-desc">{meta.description}</p>
      <p className="mono vx-placeholder-cta">
        SCOPE LIVES IN{' '}
        <a
          href="https://github.com/goliajp/vectx/blob/develop/BOUNDARY.md"
          target="_blank"
          rel="noopener noreferrer"
          className="vx-placeholder-link"
        >
          BOUNDARY.MD
        </a>
      </p>
    </section>
  )
}

function BottomBar() {
  return (
    <footer className="vx-bottom">
      <span className="mono">
        VECTX <span className="vx-sep">{SEP}</span> MIT <span className="vx-sep">{SEP}</span>{' '}
        v0.0.1
      </span>
      <a
        className="mono vx-bottom-link"
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/goliajp/vectx
      </a>
    </footer>
  )
}
