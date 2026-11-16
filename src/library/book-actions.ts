import { downloadMarkdown } from '../export/export-markdown';
import { deleteBook, getAnnotations, getBook, isDesktopApp, revealBook } from '../lib/db';
import type { ConfirmOptions } from '../ui/confirm';
import type { MenuEntry } from '../ui/menu';
import { reparseBook } from './reparse-book';

export interface ActionContext {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (text: string, error?: boolean) => void;
  /** Called after the book's files changed (re-parsed or deleted). */
  changed: (kind: 'reparsed' | 'deleted') => void;
  /** Runs after confirmation, before files change: an open book saves and stops writing here. */
  beforeChange?: () => Promise<void>;
  /** Export from memory instead of disk (an open book may have unsaved edits). */
  exportNow?: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The ⋯ actions for one book, shared by the library row and the reading view. */
export function bookActions(id: string, title: string, ctx: ActionContext, opts: { includeDelete: boolean }): MenuEntry[] {
  const run = (fn: () => Promise<void>) => () => void fn().catch((e) => ctx.toast(`${title}: ${message(e)}`, true));

  const items: MenuEntry[] = [
    {
      label: 'Xuất Markdown',
      run: run(async () => {
        if (ctx.exportNow) return ctx.exportNow();
        const [book, ann] = await Promise.all([getBook(id), getAnnotations(id)]);
        if (book) downloadMarkdown(book, ann);
      }),
    },
  ];
  if (isDesktopApp) {
    items.push(
      {
        label: 'Tách lại từ file gốc…',
        run: run(async () => {
          const ok = await ctx.confirm({
            title: 'Tách lại từ file gốc?',
            body: `"${title}" sẽ được tách chữ lại từ file gốc đã lưu. Phần đã xóa, ý của bạn và tiến độ được giữ và gắn sang bản mới; bản tách hiện tại được lưu lại thành book.prev.json.`,
            confirm: 'Tách lại',
          });
          if (!ok) return;
          await ctx.beforeChange?.();
          ctx.toast(`Đang tách lại "${title}"…`);
          try {
            ctx.toast(await reparseBook(id));
          } finally {
            ctx.changed('reparsed');
          }
        }),
      },
      { label: 'Mở thư mục sách', run: run(() => revealBook(id)) },
    );
  }
  if (opts.includeDelete) {
    items.push({
      label: 'Xóa sách…',
      danger: true,
      run: run(async () => {
        const ok = await ctx.confirm({
          title: 'Xóa sách?',
          body: isDesktopApp
            ? `"${title}" sẽ bị gỡ khỏi thư viện. Thư mục của sách, gồm file gốc, phần đã xóa và ý của bạn, được chuyển vào Thùng rác nên vẫn lấy lại được.`
            : `"${title}" cùng phần đã xóa và ý của bạn sẽ mất hẳn, không lấy lại được.`,
          confirm: 'Xóa',
          danger: true,
        });
        if (!ok) return;
        await ctx.beforeChange?.();
        await deleteBook(id);
        ctx.toast(`Đã xóa "${title}"`);
        ctx.changed('deleted');
      }),
    });
  }
  return items;
}
