export type Space = 'books' | 'writing' | 'worlds';

export const SPACES: Space[] = ['books', 'writing', 'worlds'];

/** Switches between the books you read, the works you write, and the worlds they are set in. */
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
      {tab('worlds', 'Thế giới')}
    </nav>
  );
}
