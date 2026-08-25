// Chronological merge of several plain-text logs into one.
//
// Every fdx log line is emitted by spdlog with a fixed-width, year-first
// timestamp prefix: "[YYYY-MM-DD HH:MM:SS.mmm] [L] [name] message". Because the
// prefix is fixed width and year-first, it sorts correctly with a plain string
// comparison — no Date parsing needed (and none of the timezone ambiguity it
// would add).
//
// Lines without a timestamp prefix (wrapped messages, stack traces from a crash)
// are treated as continuation lines and travel with the preceding timestamped
// line, so a multi-line entry is never split across the merge.

const TIMESTAMP_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\]/

interface LogEntry {
  key: string   // timestamp string used for sorting ('' for leading orphan lines)
  text: string  // the full entry (its timestamped line + any continuation lines)
}

// Split one log into entries, attaching continuation lines to their parent.
function toEntries(log: string): LogEntry[] {
  const entries: LogEntry[] = []
  const lines = log.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Drop the trailing empty string produced by a final newline.
    if (i === lines.length - 1 && line === '') continue
    const match = line.match(TIMESTAMP_RE)
    if (match) {
      entries.push({ key: match[1], text: line })
    } else if (entries.length > 0) {
      // Continuation of the previous entry.
      entries[entries.length - 1].text += '\n' + line
    } else {
      // Orphan line before any timestamp: keep it, sort it first.
      entries.push({ key: '', text: line })
    }
  }
  return entries
}

/**
 * Merge several logs into one, ordered chronologically by each line's timestamp.
 * Multi-line entries stay intact. The sort is stable, so entries sharing the exact
 * same timestamp keep the order of the input logs (i.e. the order services were
 * passed in). Returns a single string with a trailing newline.
 */
export function mergeLogsChronologically(logs: string[]): string {
  const all: LogEntry[] = []
  for (let s = 0; s < logs.length; s++) {
    const entries = toEntries(logs[s])
    // Tag each entry with its source index so the stable sort is deterministic.
    for (let e = 0; e < entries.length; e++) all.push(entries[e])
  }
  // Array.prototype.sort is stable in every engine we target (V8 / modern).
  all.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  const merged = all.map((e) => e.text).join('\n')
  return merged.length > 0 ? merged + '\n' : ''
}
