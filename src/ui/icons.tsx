/** Small monochrome line icons (Unicode arrows render as colored emoji on Windows). */
const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IconUp = () => <svg {...base}><path d="M4 10l4-4 4 4" /></svg>;
export const IconDown = () => <svg {...base}><path d="M4 6l4 4 4-4" /></svg>;
export const IconClose = () => <svg {...base}><path d="M4 4l8 8M12 4l-8 8" /></svg>;
export const IconBack = () => <svg {...base}><path d="M10 3.5L5.5 8l4.5 4.5" /></svg>;
export const IconMore = () => (
  <svg {...base} fill="currentColor" stroke="none">
    <circle cx="3.5" cy="8" r="1.3" />
    <circle cx="8" cy="8" r="1.3" />
    <circle cx="12.5" cy="8" r="1.3" />
  </svg>
);
