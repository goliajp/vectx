import { useState } from 'react'

import { DecoderPanel } from './components/decoder-panel'
import { FIXTURES, type Fixture } from './fixtures'
import { ResearchSection } from './research/research-section'

const SEP = '·'
const REPO_URL = 'https://github.com/goliajp/vectx'

export function App() {
  const [activeId, setActiveId] = useState(FIXTURES[0]!.id)
  const active = FIXTURES.find((f) => f.id === activeId)!

  return (
    <>
      <TopBar />
      <main className="vx-main">
        <Hero />
        <Demo activeId={activeId} setActiveId={setActiveId} active={active} />
        <ResearchSection />
      </main>
      <BottomBar />
    </>
  )
}

function TopBar() {
  return (
    <header className="vx-topbar">
      <span className="mono">
        <span style={{ color: 'var(--muted)' }}>GOLIA</span>
        <span style={{ color: 'var(--faint)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--fg)', fontWeight: 700 }}>VECTX</span>
      </span>
      <span className="mono vx-topbar-meta">
        <span className="vx-sep">{SEP}</span>
        DESCRIPTIVE LANGUAGE BETWEEN AI AND VECTOR
        <span className="vx-sep">{SEP}</span>
        DEMO
      </span>
      <a className="mono vx-topbar-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
        GITHUB ↗
      </a>
    </header>
  )
}

function Hero() {
  return (
    <section className="vx-hero">
      <p className="mono vx-eyebrow">VECTX {SEP} ALPHA {SEP} v0.0.1</p>
      <h1 className="vx-h1">vectx</h1>
      <p className="vx-thesis">The descriptive language between AI and the vector world.</p>
      <p className="vx-sub">
        AI is the primary author. Reached through Claude Code or the Claude CLI. Pick a
        fixture below — the inverse decoder fetches the SVG, recognizes structure, emits
        the DSL, and re-renders. The three columns are the round-trip.
      </p>
      <div className="vx-cta-row">
        <a className="mono vx-cta-pill" href="#decoder">
          ENTER THE DEMO ↓
        </a>
        <a className="mono vx-cta-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GITHUB.COM/GOLIAJP/VECTX ↗
        </a>
      </div>
    </section>
  )
}

function Demo({
  activeId,
  setActiveId,
  active,
}: {
  activeId: string
  setActiveId: (id: string) => void
  active: Fixture
}) {
  return (
    <section id="decoder" className="vx-demo">
      <header className="vx-demo-head">
        <h2 className="mono vx-demo-title">DECODER {SEP} SVG → DSL → SVG</h2>
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
    status === 'pass' ? 'WITHIN SCOPE' : status === 'partial' ? 'PHASE 1 GAP' : 'OUT OF SCOPE'
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
