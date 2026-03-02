/**
 * Strip common markdown formatting from text for plain-text rendering.
 * Removes: **bold**, *italic*, __bold__, _italic_, ## headings,
 * - list prefixes, numbered list prefixes (1. / 2) etc.)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')           // ## headings
    .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
    .replace(/__(.+?)__/g, '$1')          // __bold__
    .replace(/\*(.+?)\*/g, '$1')          // *italic*
    .replace(/_(.+?)_/g, '$1')            // _italic_
    .replace(/`(.+?)`/g, '$1')            // `inline code`
    .replace(/^\s*[-•*]\s+/gm, '')        // - list prefixes
    .replace(/^\s*\d+[.)]\s+/gm, '');     // 1. or 2) numbered list prefixes
}
