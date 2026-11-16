import { downloadText, safeFileName } from '../export/export-markdown';
import type { ConfirmOptions } from '../ui/confirm';
import type { MenuEntry } from '../ui/menu';
import { NOTEBOOK, type Work } from './types';
import { writing } from './writing-store';

export interface WorkActionContext {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (text: string, error?: boolean) => void;
  /** Called after the work was deleted. */
  deleted: () => void;
  /** Saves pending edits first, when the work is open. */
  beforeExport?: () => Promise<void>;
}

/** The whole manuscript as one Markdown file; the notebook goes last, after a rule. */
export async function workMarkdown(work: Work): Promise<string> {
  const store = await writing;
  const lines = [`# ${work.title}`, ''];
  for (const p of work.parts) {
    const text = (await store.getText(work.id, p.id)).trim();
    lines.push(`## ${p.title}`, '', ...(text ? [text, ''] : []));
  }
  const notebook = (await store.getText(work.id, NOTEBOOK)).trim();
  if (notebook) lines.push('---', '', '## Sổ tay', '', notebook, '');
  return lines.join('\n').trimEnd() + '\n';
}

export function workActions(work: Work, ctx: WorkActionContext): MenuEntry[] {
  const fail = (e: unknown) => ctx.toast(e instanceof Error ? e.message : String(e), true);
  return [
    {
      label: 'Xuất Markdown',
      run: () =>
        void (async () => {
          await ctx.beforeExport?.();
          downloadText(`${safeFileName(work.title, 'tac-pham')}.md`, await workMarkdown(work));
        })().catch(fail),
    },
    { label: 'Mở thư mục tác phẩm', run: () => void writing.then((s) => s.reveal(work.id)).catch(fail) },
    {
      label: 'Xóa tác phẩm…',
      danger: true,
      run: () =>
        void (async () => {
          const ok = await ctx.confirm({
            title: `Xóa "${work.title}"?`,
            body: 'Thư mục tác phẩm được chuyển vào Thùng rác, vẫn lấy lại được từ đó.',
            confirm: 'Xóa',
            danger: true,
          });
          if (!ok) return;
          await (await writing).deleteWork(work.id);
          ctx.toast(`Đã chuyển "${work.title}" vào Thùng rác`);
          ctx.deleted();
        })().catch(fail),
    },
  ];
}
