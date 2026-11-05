
export  const isValidInteger = (value: number): boolean => {
  return Number.isFinite(value)
  && parseInt(value.toString()) === value
}

export const customLog = (...args: any) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Safe markup for v-html: matches are found in the raw text, then every piece is escaped.
export const highlightMatch = (text: string | undefined | null, term: string): string => {
  const raw = String(text ?? '')
  const needle = term.trim().toLowerCase()
  if (!needle) return escapeHtml(raw)
  const lower = raw.toLowerCase()
  let out = ''
  let i = 0
  for (let j = lower.indexOf(needle); j !== -1; j = lower.indexOf(needle, i)) {
    out += escapeHtml(raw.slice(i, j)) + `<span class="text-brand font-bold">${escapeHtml(raw.slice(j, j + needle.length))}</span>`
    i = j + needle.length
  }
  return out + escapeHtml(raw.slice(i))
}
