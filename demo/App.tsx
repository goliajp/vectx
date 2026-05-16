import { useEffect, useMemo, useState } from 'react'

import { emitDsl, recognize, renderRecognized, type Recognized } from '../src/index'

type Fixture = {
  id: string
  label: string
  url: string
  failureNote: string
}

const FIXTURES: Fixture[] = [
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
          vectx · demo · svg → dsl → svg
        </p>
        <h1
          style={{
            fontSize: 36,
            marginTop: 6,
            letterSpacing: '0.04em',
          }}
        >
          vectx
        </h1>
        <p style={{ marginTop: 8, maxWidth: 760, color: 'var(--muted)' }}>
          Pick a fixture. The decoder fetches it, recognizes structure, emits a
          DSL, re-renders. Compare visually + read the DSL to see what got
          extracted.
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

      <DecoderRow url={active.url} />
    </main>
  )
}

function DecoderRow({ url }: { url: string }) {
  type State =
    | { tag: 'loading' }
    | { tag: 'ready'; raw: string; rec: Recognized; parseMs: number }
    | { tag: 'error'; msg: string }
  const [state, setState] = useState<State>({ tag: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ tag: 'loading' })
    fetch(url, { mode: 'cors' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (cancelled) return
        requestAnimationFrame(() => {
          if (cancelled) return
          const t0 = performance.now()
          const rec = recognize(text)
          const t1 = performance.now()
          setState({ tag: 'ready', raw: text, rec, parseMs: t1 - t0 })
        })
      })
      .catch((e) => !cancelled && setState({ tag: 'error', msg: String(e) }))
    return () => {
      cancelled = true
    }
  }, [url])

  if (state.tag === 'loading') return <Loading label="fetching + recognizing…" />
  if (state.tag === 'error')
    return (
      <div style={{ color: 'var(--accent)', padding: 12 }}>error: {state.msg}</div>
    )

  const { raw, rec, parseMs } = state
  return <DecoderResult raw={raw} rec={rec} parseMs={parseMs} />
}

function DecoderResult({
  raw,
  rec,
  parseMs,
}: {
  raw: string
  rec: Recognized
  parseMs: number
}) {
  const dsl = useMemo(() => emitDsl(rec), [rec])
  const decoded = useMemo(() => renderRecognized(rec).slice(0, 800), [rec])
  const labeled = rec.primitives.filter((p) => 'label' in p && p.label).length
  const texts = rec.primitives.filter((p) => p.kind === 'text').length
  const docCount = rec.doc.titles.length + rec.doc.descs.length + rec.doc.metadata.length

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
      }}
    >
      <Panel label={`input · ${(new Blob([raw]).size / 1024).toFixed(0)} KB`}>
        <div
          style={{ width: '100%', aspectRatio: '1 / 1', background: '#fff' }}
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      </Panel>
      <Panel label={`recognized · ${rec.primitives.length} prims · ${rec.styles.size} styles`}>
        <div
          style={{
            padding: 8,
            background: 'rgba(31,110,58,0.06)',
            fontSize: 11,
            marginBottom: 6,
          }}
        >
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            intent extracted
          </div>
          {rec.doc.titles[0] && (
            <div style={{ marginBottom: 2 }}>
              <span className="mono" style={{ fontSize: 9, color: 'var(--faint)', marginRight: 4 }}>
                title:
              </span>
              {rec.doc.titles[0]}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
            {labeled > 0 && (
              <span>
                <span className="mono" style={{ color: 'var(--faint)' }}>id:</span> {labeled}
              </span>
            )}
            {texts > 0 && (
              <span>
                <span className="mono" style={{ color: 'var(--faint)' }}>text:</span> {texts}
              </span>
            )}
            {rec.doc.descs.length > 0 && (
              <span>
                <span className="mono" style={{ color: 'var(--faint)' }}>desc:</span> {rec.doc.descs.length}
              </span>
            )}
            <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
              recognize {parseMs.toFixed(0)}ms
            </span>
          </div>
        </div>
        <pre
          className="mono"
          style={{
            fontSize: 9.5,
            lineHeight: 1.5,
            maxHeight: 360,
            overflow: 'auto',
            padding: 8,
            background: 'rgba(28,22,17,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            whiteSpace: 'pre',
          }}
        >
          <code>{dsl.slice(0, 4000)}{dsl.length > 4000 ? '\n…' : ''}</code>
        </pre>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--faint)', marginTop: 6, textTransform: 'uppercase' }}>
          {dsl.length.toLocaleString()} bytes · {docCount} doc · {labeled + texts + docCount} semantic items
        </div>
      </Panel>
      <Panel label={`re-render · ${decoded.length} prims`}>
        <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#fff' }}>
          <svg
            viewBox={`0 0 ${rec.viewW} ${rec.viewH}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
          >
            {decoded}
          </svg>
        </div>
      </Panel>
    </div>
  )
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', padding: 8 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--muted)',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <div
      className="mono"
      style={{
        padding: 20,
        textAlign: 'center',
        fontSize: 11,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      {label}
    </div>
  )
}
