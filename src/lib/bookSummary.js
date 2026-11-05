export function getBookSummaryQuery(message) {
  const text = message.trim();
  const aboutMatch = text.match(/^what is\s+(.+?)\s+about\??$/i);
  if (aboutMatch) return aboutMatch[1].trim();

  const prefix = text.match(
    /^(?:please\s+)?(?:(?:can|could) you\s+)?(?:summari[sz]e|summary(?:\s+of)?|synopsis|plot(?:\s+of)?|tell me about|what is)\s+/i
  );
  if (!prefix) return null;

  return text
    .slice(prefix[0].length)
    .replace(/^(?:(?:the|a)\s+)?book\s+/i, '')
    .replace(/\s+about\??$/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
}

export function getBookSummary(book) {
  const summary = (book.summary || book.description || '').trim();
  if (!summary) return '';
  return summary.length > 260 ? `${summary.slice(0, 257).trim()}...` : summary;
}

export function formatBookSummary(book) {
  const summary = getBookSummary(book);
  return summary
    ? `${book.title} by ${book.author}: ${summary}`
    : `I couldn’t find a summary for “${book.title}” yet, but this title is in the library catalog.`;
}
