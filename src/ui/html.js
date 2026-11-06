export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Only this module can create trusted fragments. Ordinary values, including
// objects with a custom toString, are always escaped. Use arrays for composition.
const fragments = new WeakMap();
class Fragment {
  constructor(markup) {
    fragments.set(this, markup);
    Object.freeze(this);
  }
  toString() {
    return fragments.get(this);
  }
}
function render(value) {
  if (value instanceof Fragment) return fragments.get(value);
  if (Array.isArray(value)) return value.map(render).join('');
  return value === null || value === undefined ? '' : escapeHtml(value);
}
export function html(strings, ...values) {
  return new Fragment(strings.reduce((result, part, i) => result + part + render(values[i]), ''));
}
