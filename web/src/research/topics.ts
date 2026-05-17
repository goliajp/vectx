/**
 * Research topic loader.
 *
 * Imports `.claude/researches/topic/<topic>/README.md` and the optional
 * sibling `playground.html` as raw strings at build time via Vite's
 * import.meta.glob. New topics show up automatically — drop a directory
 * under `.claude/researches/topic/<id>/` and `bun run dev` picks it up.
 */

export type TopicMeta = {
  id: string
  title: string
  date: string | null
  status: string | null
  topic: string | null
  lede: string | null
}

export type Topic = {
  id: string
  readme: string
  playgroundHtml: string | null
  meta: TopicMeta
}

const READMES = import.meta.glob<string>(
  '../../../.claude/researches/topic/*/README.md',
  { query: '?raw', import: 'default', eager: true },
)

const PLAYGROUNDS = import.meta.glob<string>(
  '../../../.claude/researches/topic/*/playground.html',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

function idFromPath(path: string): string {
  const m = path.match(/\/topic\/([^/]+)\//)
  return m ? m[1]! : path
}

function metaFromReadme(readme: string, id: string): TopicMeta {
  const title = readme.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? id
  // Table rows: | date | 2026-05-17 |
  const cell = (key: string): string | null => {
    const re = new RegExp(`^\\|\\s*${key}\\s*\\|\\s*([^|]+?)\\s*\\|`, 'im')
    return readme.match(re)?.[1]?.trim() ?? null
  }
  // First paragraph after the metadata table — used as a lede
  const ledeMatch = readme.match(/##\s+TL;DR\s*\n+([^\n]+)/i)
  const lede = ledeMatch?.[1]?.trim() ?? null

  return {
    id,
    title,
    date: cell('date'),
    status: cell('status'),
    topic: cell('topic'),
    lede,
  }
}

export const RESEARCH_TOPICS: Topic[] = Object.entries(READMES)
  .map(([path, readme]) => {
    const id = idFromPath(path)
    const playgroundKey = path.replace(/README\.md$/, 'playground.html')
    const playgroundHtml = PLAYGROUNDS[playgroundKey] ?? null
    return { id, readme, playgroundHtml, meta: metaFromReadme(readme, id) }
  })
  .sort((a, b) => a.id.localeCompare(b.id))
