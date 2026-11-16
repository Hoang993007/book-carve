import { useState } from 'react';
import { relativeTime } from '../lib/progress';
import { MoreMenu } from '../ui/menu';
import type { Idea } from './types';

interface Props {
  ideas: Idea[];
  onAdd: (text: string) => void;
  onUse: (idea: Idea) => void;
  onDelete: (idea: Idea) => void;
}

/** Loose ideas: written down in a second, moved into a work when their place is clear. */
export function IdeasPanel({ ideas, onAdd, onUse, onDelete }: Props) {
  const [draft, setDraft] = useState('');
  const save = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <section className="ideas" aria-label="Mẩu ý">
      <h2>
        Mẩu ý <span className="muted">{ideas.length || ''}</span>
      </h2>
      <textarea
        className="idea-capture"
        value={draft}
        rows={2}
        spellCheck={false}
        placeholder="Ghi nhanh một ý… (Enter để lưu, Shift+Enter xuống dòng)"
        aria-label="Ghi nhanh một ý"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
      />
      <ul className="idea-list">
        {ideas.map((idea) => (
          <li key={idea.id} className="idea">
            <p>{idea.text}</p>
            <span className="muted">{relativeTime(idea.createdAt)}</span>
            <MoreMenu
              label="Thao tác với mẩu ý"
              items={[
                { label: 'Đưa vào tác phẩm…', run: () => onUse(idea) },
                { label: 'Xóa mẩu ý…', danger: true, run: () => onDelete(idea) },
              ]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
