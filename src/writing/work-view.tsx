import { useEffect, useState } from 'react';
import type { Work } from './types';
import { WorkScreen } from './work-screen';
import { writing } from './writing-store';

/** Loads a work, then hands it to the writing screen. */
export function WorkView({ workId, onBack }: { workId: string; onBack: () => void }) {
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
  return <WorkScreen initial={work} onBack={onBack} />;
}
