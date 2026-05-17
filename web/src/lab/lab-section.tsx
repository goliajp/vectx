import { useState } from 'react'

import { LABS, type Lab } from './labs'

const SEP = '·'

/**
 * LABS view — active workshop. Three columns:
 *   col 1: menu (fixed width, sticky)
 *   col 2 + col 3: lab content area (each lab decides how to use them;
 *                  the grammar lab splits internally as 1fr / 1fr).
 *
 * Mirrors the visual treatment of RESEARCH but the data is in-code
 * (web/src/lab/labs.ts) instead of file-globbed — labs iterate fast
 * enough that going through markdown files would be friction.
 */
export function LabSection() {
  const [activeId, setActiveId] = useState(LABS[0]?.id ?? '')
  const active = LABS.find((l) => l.id === activeId) ?? LABS[0]

  return (
    <section className="vx-lab">
      <header className="vx-lab-head">
        <h2 className="mono vx-lab-title">LABS {SEP} ACTIVE EXPLORATION</h2>
        <p className="mono vx-lab-sub">
          WORKSHOP {SEP} HIGH-FREQUENCY ITERATION {SEP} GRADUATES TO MODULE WHEN STABLE
        </p>
      </header>

      {!active ? (
        <EmptyState />
      ) : (
        <div className="vx-lab-layout">
          <LabMenu activeId={activeId} setActiveId={setActiveId} />
          <LabPanel lab={active} />
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="vx-lab-empty mono">
      <p>NO LABS YET — ADD A NEW ENTRY TO <code>web/src/lab/labs.ts</code>.</p>
    </div>
  )
}

function LabMenu({
  activeId,
  setActiveId,
}: {
  activeId: string
  setActiveId: (id: string) => void
}) {
  return (
    <nav className="vx-lab-menu" aria-label="lab list">
      <div className="vx-lab-menu-head mono">
        <span>LABS</span>
        <span className="vx-lab-menu-count">
          {LABS.length.toString().padStart(2, '0')}
        </span>
      </div>
      <ul className="vx-lab-menu-list">
        {LABS.map((l, i) => {
          const isActive = l.id === activeId
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setActiveId(l.id)}
                className={`vx-lab-menu-item${isActive ? ' is-active' : ''}`}
                aria-pressed={isActive}
              >
                <span className="mono vx-lab-menu-idx">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="vx-lab-menu-body">
                  <span className="mono vx-lab-menu-id">{l.id}</span>
                </span>
                <span className="vx-lab-menu-arrow" aria-hidden>
                  {isActive ? '●' : '○'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function LabPanel({ lab }: { lab: Lab }) {
  const Content = lab.Content
  return (
    <div className="vx-lab-main">
      <div className="vx-lab-meta">
        <div className="vx-lab-meta-body">
          <div className="mono vx-lab-meta-tag">
            LAB {SEP} {lab.id.toUpperCase()}
          </div>
          <h3 className="vx-lab-meta-title">{lab.title}</h3>
          <p className="vx-lab-meta-lede">{lab.lede}</p>
        </div>
        <dl className="mono vx-lab-meta-kv">
          <dt>date</dt>
          <dd>{lab.date}</dd>
          <dt>status</dt>
          <dd>{lab.status}</dd>
        </dl>
      </div>
      <div className="vx-lab-content">
        <Content />
      </div>
    </div>
  )
}
