/** Plain string templates; all dynamic user text is escaped explicitly. */
export function html(strings, ...values) {
  return strings.reduce((result, part, i) => result + part + (values[i] ?? ''), '');
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
