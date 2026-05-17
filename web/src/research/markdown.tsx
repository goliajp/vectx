import { Marked } from 'marked'
import { useMemo } from 'react'

/**
 * Lightweight React markdown component.
 *
 * Uses `marked` to parse markdown → HTML, then injects via
 * `dangerouslySetInnerHTML`. Input is project-owned (research notes
 * authored in this repo), so XSS surface is minimal.
 *
 * GFM is on: tables, strikethrough, autolinks. External links get
 * `target="_blank"` + rel set via a post-process pass on the HTML
 * string — marked's renderer customization API has shifted across
 * versions, this is the simplest stable approach.
 */

const marked = new Marked({ gfm: true, breaks: false })

function postProcess(html: string): string {
  // External http(s) anchors → open in new tab.
  return html.replace(
    /<a href="(https?:[^"]+)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  )
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => postProcess(marked.parse(source) as string), [source])
  return (
    <div className={className ?? 'vx-prose'} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
