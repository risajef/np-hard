import { html } from './html.js';
const icons = {
  route: html`
    <path d="M5 6h7l-4 6h11M5 6v0M19 12v6H7" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="19" cy="12" r="2" />
  `,
  color: html`
    <circle cx="8" cy="8" r="4" />
    <circle cx="16" cy="8" r="4" />
    <circle cx="12" cy="15" r="4" />
  `,
  nodes: html`
    <path d="m6 6 12 2-6 11L6 6m6 13L4 14m14-6 2 10" />
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="8" r="2" />
    <circle cx="12" cy="19" r="2" />
  `,
  logic: html`
    <path d="m8 6-5 6 5 6m8-12 5 6-5 6M14 4l-4 16" />
  `,
  bag: html`
    <rect x="5" y="7" width="14" height="14" rx="3" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2M5 13h14m-9-2v4h4v-4" />
  `,
  schedule: html`
    <path d="M4 4v16h17M8 7h8m-5 5h9M7 17h7" />
  `,
  pin: html`
    <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
    <circle cx="12" cy="10" r="2" />
  `,
  gallery: html`
    <path d="m3 8 9-5 9 5H3m2 3v8m7-8v8m7-8v8M3 21h18" />
  `,
  square: html`
    <rect x="3" y="3" width="12" height="12" rx="1" />
    <rect x="9" y="9" width="12" height="12" rx="1" />
  `,
  grid: html`
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  `,
  chart: html`
    <path d="M4 4v16h16M9 16v-4m5 4V8m5 8V4" />
  `,
  arrow: html`
    <path d="M5 12h14m-6-6 6 6-6 6" />
  `,
  check: html`
    <path d="m5 12 4 4L19 6" />
  `,
  refresh: html`
    <path d="M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 14-2l1 6M4 12l1 6a8 8 0 0 0 14-2" />
  `,
  help: html`
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1" />
  `,
  chevron: html`
    <path d="m9 5 7 7-7 7" />
  `,
  search: html`
    <circle cx="10" cy="10" r="6" />
    <path d="m15 15 5 5" />
  `,
  star: html`
    <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />
  `,
};
export const icon = (id, cls = '') => html`
  <svg
    class="icon ${cls}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    ${icons[id] || icons.grid}
  </svg>
`;
