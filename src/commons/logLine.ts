// Parser for the spdlog line format shared by every fdx service:
// "[YYYY-MM-DD HH:MM:SS.mmm] [L] [app][module] message". Lines without that prefix are
// continuations (tables, multi-line messages) of the previous entry.

export type LogLevel = 'TRC' | 'DBG' | 'INF' | 'WRN' | 'ERR'
export type LogSource = 'hs' | 'api' | 'wifi' | 'other'

export interface LogEntry {
  id: number
  date: string          // "2026-11-03"
  time: string          // "10:03:12.345"
  level: LogLevel
  source: LogSource
  module: string
  message: string
  continuation: string[]
  raw: string           // original text, continuations included
}

const LINE_RE = /^\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d{3})\] \[([TDIWE])\] \[([^\]]*)\](?:\[([^\]]*)\])? ?(.*)$/

const LEVELS: Record<string, LogLevel> = { T: 'TRC', D: 'DBG', I: 'INF', W: 'WRN', E: 'ERR' }
const SOURCES: Record<string, LogSource> = { 'fdx-hs': 'hs', fdx_api: 'api', wifi: 'wifi' }

export const SOURCE_LABEL: Record<LogSource, string> = { hs: 'HS', api: 'API', wifi: 'WiFi', other: '?' }

let nextId = 1

// Folds raw lines into entries, attaching continuation lines to `last` (or the newest new entry).
export function appendLines(lines: string[], last: LogEntry | undefined): { entries: LogEntry[], extended: boolean } {
  const entries: LogEntry[] = []
  let extended = false
  for (const line of lines) {
    const m = LINE_RE.exec(line)
    if (m) {
      entries.push({
        id: nextId++,
        date: m[1],
        time: m[2],
        level: LEVELS[m[3]],
        source: SOURCES[m[4]] ?? 'other',
        module: m[5] ?? '',
        message: m[6],
        continuation: [],
        raw: line,
      })
      continue
    }
    if (line === '') continue
    const parent = entries.length ? entries[entries.length - 1] : last
    if (!parent) continue
    parent.continuation.push(line)
    parent.raw += '\n' + line
    if (parent === last) extended = true
  }
  return { entries, extended }
}
