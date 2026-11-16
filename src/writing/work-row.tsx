import { relativeTime } from '../lib/progress';
import { MoreMenu } from '../ui/menu';
import { STATUS_LABEL, type Work } from './types';
import { workActions, type WorkActionContext } from './work-actions';
import { totalWords } from './work-ops';

interface Props {
  work: Work;
  onOpen: (id: string) => void;
  ctx: WorkActionContext;
}

const fmt = new Intl.NumberFormat('vi-VN');

/** One work: its name and size, where it stands, when you last wrote in it. */
export function WorkRow({ work, onOpen, ctx }: Props) {
  const parts = work.parts.length;
  return (
    <div className="book-row work-row" role="row">
      <button className="book-name" onClick={() => onOpen(work.id)}>
        <span className="title">{work.title || 'Chưa đặt tên'}</span>
        <span className="muted">
          {parts > 1 ? `${parts} chương` : 'Một bài'} · {fmt.format(totalWords(work))} chữ
        </span>
      </button>
      <span className={`status-tag ${work.status}`}>{STATUS_LABEL[work.status]}</span>
      <span className="muted num">{relativeTime(work.updatedAt)}</span>
      <MoreMenu label={`Thao tác với ${work.title}`} items={workActions(work, ctx)} />
    </div>
  );
}
