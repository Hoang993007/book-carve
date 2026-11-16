export type Space = 'books' | 'writing';

/** Switches between the books you read and the works you write. */
export function SpaceTabs({ space, onSwitch }: { space: Space; onSwitch: (s: Space) => void }) {
  const tab = (s: Space, label: string) => (
    <button role="tab" aria-selected={space === s} className={space === s ? 'current' : undefined} onClick={() => onSwitch(s)}>
      {label}
    </button>
  );
  return (
    <nav className="space-tabs" role="tablist" aria-label="Khu vực">
      {tab('books', 'Thư viện')}
      {tab('writing', 'Viết')}
    </nav>
  );
}
