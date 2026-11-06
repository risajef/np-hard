const identities = [
  'id',
  'data-op',
  'data-node',
  'data-color',
  'data-action',
  'data-view',
  'data-game',
  'data-filter',
];

/** Preserve the exact occurrence: SAT literals can share a variable identity. */
export function captureFocus(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return null;
  const attribute = identities.find((name) => active.hasAttribute(name));
  if (!attribute) return null;
  const value = active.getAttribute(attribute);
  const tag = active.tagName;
  const matches = [...root.querySelectorAll(`[${attribute}]`)].filter(
    (element) => element.getAttribute(attribute) === value && element.tagName === tag,
  );
  let selection;
  try {
    if (typeof active.selectionStart === 'number')
      selection = [active.selectionStart, active.selectionEnd];
  } catch {
    /* Some controls do not support text selection. */
  }
  return { attribute, value, tag, index: matches.indexOf(active), selection };
}

export function restoreFocus(root, saved) {
  if (!saved) return;
  const matches = [...root.querySelectorAll(`[${saved.attribute}]`)].filter(
    (element) =>
      element.getAttribute(saved.attribute) === saved.value && element.tagName === saved.tag,
  );
  let target = matches[saved.index] ?? matches[0];
  if (!target || target.disabled)
    target = root.querySelector('[data-action="reset"]') ?? root.querySelector('button, a, input');
  target?.focus({ preventScroll: true });
  if (saved.selection && target?.setSelectionRange) {
    try {
      target.setSelectionRange(...saved.selection);
    } catch {
      /* Unsupported input type. */
    }
  }
}
