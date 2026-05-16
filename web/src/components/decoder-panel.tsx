import { useEffect, useMemo, useState } from 'react'

import { emitDsl, recognize, renderRecognized, type Recognized } from 'vectx'

type State =
  | { tag: 'loading' }
  | { tag: 'ready'; raw: string; rec: Recognized; parseMs: number }
  | { tag: 'error'; msg: string }

export function DecoderPanel({ url }: { url: string }) {
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

  if (state.tag === 'loading')
    return <div className="vx-status mono">FETCHING + RECOGNIZING …</div>
  if (state.tag === 'error')
    return <div className="vx-status vx-status-err mono">ERR · {state.msg}</div>
  return <Result raw={state.raw} rec={state.rec} parseMs={state.parseMs} />
}

function Result({ raw, rec, parseMs }: { raw: string; rec: Recognized; parseMs: number }) {
  const dsl = useMemo(() => emitDsl(rec), [rec])
  const decoded = useMemo(() => renderRecognized(rec).slice(0, 800), [rec])
  const labeled = rec.primitives.filter((p) => 'label' in p && p.label).length
  const texts = rec.primitives.filter((p) => p.kind === 'text').length
  const docCount = rec.doc.titles.length + rec.doc.descs.length + rec.doc.metadata.length
  const sizeKb = (new Blob([raw]).size / 1024).toFixed(0)
  const dslBytes = dsl.length.toLocaleString()
  const semanticItems = labeled + texts + docCount

  return (
    <div className="vx-grid">
      <Panel label="INPUT" meta={`${sizeKb} KB`}>
        <div className="vx-frame" dangerouslySetInnerHTML={{ __html: raw }} />
      </Panel>

      <Panel
        label="RECOGNIZED"
        meta={`${rec.primitives.length} prims · ${rec.styles.size} styles`}
      >
        <div className="vx-intent">
          <div className="vx-intent-head mono">
            <span>INTENT EXTRACTED</span>
            <span className="vx-intent-time">{parseMs.toFixed(0)} ms</span>
          </div>
          {rec.doc.titles[0] && (
            <div className="vx-intent-row">
              <span className="mono vx-intent-key">TITLE</span>
              <span className="vx-intent-val">{rec.doc.titles[0]}</span>
            </div>
          )}
          <div className="vx-intent-stats">
            {labeled > 0 && <Stat k="id" v={labeled} />}
            {texts > 0 && <Stat k="text" v={texts} />}
            {rec.doc.descs.length > 0 && <Stat k="desc" v={rec.doc.descs.length} />}
          </div>
        </div>
        <pre className="mono vx-dsl">
          <code>
            {dsl.slice(0, 4000)}
            {dsl.length > 4000 ? '\n…' : ''}
          </code>
        </pre>
        <div className="mono vx-dsl-foot">
          {dslBytes} BYTES · {docCount} DOC · {semanticItems} SEMANTIC
        </div>
      </Panel>

      <Panel label="RE-RENDER" meta={`${decoded.length} prims`}>
        <div className="vx-frame">
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

function Panel({
  label,
  meta,
  children,
}: {
  label: string
  meta: string
  children: React.ReactNode
}) {
  return (
    <article className="vx-panel">
      <header className="vx-panel-head">
        <h3 className="mono vx-panel-label">{label}</h3>
        <span className="mono vx-panel-meta">{meta}</span>
      </header>
      <div className="vx-panel-body">{children}</div>
    </article>
  )
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <span className="vx-stat">
      <span className="mono vx-stat-k">{k}</span>
      <span className="mono vx-stat-v">{v}</span>
    </span>
  )
}
