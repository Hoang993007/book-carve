import { useEffect, useState } from 'react';
import type { Work } from './types';
import { WorkScreen } from './work-screen';
import { writing } from './writing-store';

interface Props {
  workId: string;
  /** Opens this chapter instead of the one you last wrote in. */
  part?: string;
  onBack: () => void;
  backLabel?: string;
}

/** Loads a work, then hands it to the writing screen. */
export function WorkView({ workId, part, onBack, backLabel }: Props) {
  const [work, setWork] = useState<Work | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void writing.then((s) => s.getWork(workId)).then((w) => live && setWork(w));
    return () => {
      live = false;
    };
  }, [workId]);

  if (work === undefined) return null;
  if (work === null) {
    return (
      <div className="empty-state">
        <p>Không tìm thấy tác phẩm này.</p>
        <button onClick={onBack}>Về danh sách</button>
      </div>
    );
  }
  const initial = part && work.parts.some((p) => p.id === part) ? { ...work, last: { part, caret: 0 } } : work;
  return <WorkScreen initial={initial} onBack={onBack} backLabel={backLabel} />;
}
