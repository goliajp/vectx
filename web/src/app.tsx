import { useState } from 'react'

import { DecoderPanel } from './components/decoder-panel'
import { FIXTURES } from './fixtures'

export function App() {
  const [activeId, setActiveId] = useState(FIXTURES[0]!.id)
  const active = FIXTURES.find((f) => f.id === activeId)!

  return (
    <main style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <p
          className="mono"
          style={{
            color: 'var(--muted)',
            fontSize: 10,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
          }}
        >
          vectx · svg → dsl → svg
        </p>
        <h1 style={{ fontSize: 36, marginTop: 6, letterSpacing: '0.04em' }}>vectx</h1>
        <p style={{ marginTop: 8, maxWidth: 760, color: 'var(--muted)' }}>
          The descriptive language between AI and the vector world. Pick a fixture — the
          decoder fetches it, recognizes structure, emits the DSL, re-renders. Compare
          visually and read the DSL to see what got extracted.
        </p>
      </header>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {FIXTURES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveId(f.id)}
            className="mono"
            style={{
              padding: '6px 12px',
              border: '1px solid var(--border)',
              background: f.id === activeId ? 'var(--fg)' : 'transparent',
              color: f.id === activeId ? 'var(--bg)' : 'var(--muted)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {f.id}
          </button>
        ))}
      </nav>

      <p
        style={{
          marginBottom: 16,
          padding: '10px 12px',
          border: '1px solid var(--border)',
          background: 'rgba(168,107,31,0.06)',
          fontSize: 12,
          color: 'var(--fg)',
        }}
      >
        <strong>{active.label}</strong> — {active.failureNote}
      </p>

      <DecoderPanel url={active.url} />
    </main>
  )
}
