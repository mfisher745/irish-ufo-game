/** Greedy word wrap into lines of at most `maxChars`. Over-long words are split. */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter((w) => w.length > 0)) {
    let w = word;
    while (w.length > maxChars) {
      if (current.length > 0) {
        lines.push(current);
        current = '';
      }
      lines.push(w.slice(0, maxChars));
      w = w.slice(maxChars);
    }
    if (current.length === 0) current = w;
    else if (current.length + 1 + w.length <= maxChars) current += ` ${w}`;
    else {
      lines.push(current);
      current = w;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/** Wrap, then split into pages of at most `maxLines` lines. Never returns an empty list. */
export function paginate(text: string, maxChars: number, maxLines: number): string[][] {
  const lines = wrapText(text, maxChars);
  if (lines.length === 0) return [[]];
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) pages.push(lines.slice(i, i + maxLines));
  return pages;
}
