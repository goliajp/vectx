import { useState } from 'react'

import { Markdown } from './markdown'
import { RESEARCH_TOPICS, type Topic } from './topics'

const SEP = '·'

export function ResearchSection() {
  const [activeId, setActiveId] = useState(RESEARCH_TOPICS[0]?.id ?? '')
  const active = RESEARCH_TOPICS.find((t) => t.id === activeId) ?? RESEARCH_TOPICS[0]

  return (
    <section className="vx-research">
      <header className="vx-research-head">
        <h2 className="mono vx-research-title">RESEARCH {SEP} EXPLORATION NOTES</h2>
        <p className="mono vx-research-sub">
          THINKING IN PROGRESS {SEP} NOT V0 SCOPE {SEP} ONE TOPIC = NOTES + LIVE PLAYGROUND
        </p>
      </header>

      {RESEARCH_TOPICS.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="vx-research-layout">
          <TopicMenu activeId={activeId} setActiveId={setActiveId} />
          {active && <TopicView topic={active} />}
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="vx-research-empty mono">
      <p>NO TOPICS YET.</p>
      <p className="vx-research-empty-hint">
        ADD A FOLDER UNDER <code>.claude/researches/topic/&lt;id&gt;/</code> WITH A
        <code>README.md</code> AND OPTIONAL <code>playground.html</code>.
      </p>
    </div>
  )
}

function TopicMenu({
  activeId,
  setActiveId,
}: {
  activeId: string
  setActiveId: (id: string) => void
}) {
  return (
    <nav className="vx-research-menu" aria-label="research topics">
      <div className="vx-research-menu-head mono">
        <span>TOPICS</span>
        <span className="vx-research-menu-count">{RESEARCH_TOPICS.length.toString().padStart(2, '0')}</span>
      </div>
      <ul className="vx-research-menu-list">
        {RESEARCH_TOPICS.map((t, i) => {
          const isActive = t.id === activeId
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`vx-research-menu-item${isActive ? ' is-active' : ''}`}
                aria-pressed={isActive}
              >
                <span className="mono vx-research-menu-idx">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="vx-research-menu-body">
                  <span className="mono vx-research-menu-id">{t.id}</span>
                </span>
                <span className="vx-research-menu-arrow" aria-hidden>
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

function TopicView({ topic }: { topic: Topic }) {
  return (
    <div className="vx-research-view">
      <TopicMeta topic={topic} />
      <NotesPanel topic={topic} />
      {topic.playgroundHtml && <PlaygroundPanel id={topic.id} html={topic.playgroundHtml} />}
    </div>
  )
}

function TopicMeta({ topic }: { topic: Topic }) {
  const { meta } = topic
  return (
    <div className="vx-research-meta">
      <div className="vx-research-meta-body">
        <div className="mono vx-research-meta-tag">
          RESEARCH {SEP} {topic.id.toUpperCase()}
        </div>
        <h3 className="vx-research-meta-title">{meta.title}</h3>
        {meta.lede && <p className="vx-research-meta-lede">{meta.lede}</p>}
      </div>
      <dl className="mono vx-research-meta-kv">
        {meta.date && (
          <>
            <dt>date</dt>
            <dd>{meta.date}</dd>
          </>
        )}
        {meta.status && (
          <>
            <dt>status</dt>
            <dd>{meta.status}</dd>
          </>
        )}
        {meta.topic && (
          <>
            <dt>scope</dt>
            <dd>{meta.topic}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

function NotesPanel({ topic }: { topic: Topic }) {
  return (
    <article className="vx-research-panel">
      <header className="vx-research-panel-head mono">
        <span className="vx-research-panel-label">README {SEP} NOTES</span>
        <span className="vx-research-panel-meta">
          {topic.readme.length.toLocaleString()} BYTES {SEP} MARKDOWN
        </span>
      </header>
      <div className="vx-research-panel-body">
        <Markdown source={topic.readme} className="vx-prose" />
      </div>
    </article>
  )
}

function PlaygroundPanel({ id, html }: { id: string; html: string }) {
  return (
    <article className="vx-research-panel">
      <header className="vx-research-panel-head mono">
        <span className="vx-research-panel-label">PLAYGROUND {SEP} INLINE</span>
        <span className="vx-research-panel-meta">
          {html.length.toLocaleString()} BYTES {SEP} SELF-CONTAINED HTML
        </span>
      </header>
      <div className="vx-research-panel-body vx-research-panel-body-flush">
        <iframe
          className="vx-research-frame"
          srcDoc={html}
          sandbox="allow-scripts"
          title={`playground · ${id}`}
        />
      </div>
    </article>
  )
}
