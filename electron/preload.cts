import { contextBridge, ipcRenderer } from 'electron';

// The renderer's only door to the disk. Shape matches BookStore in src/lib/store.ts.
contextBridge.exposeInMainWorld('bookCarve', {
  location: () => ipcRenderer.invoke('store:location'),
  listBooks: () => ipcRenderer.invoke('store:list-books'),
  listAnnotations: () => ipcRenderer.invoke('store:list-annotations'),
  getBook: (id: string) => ipcRenderer.invoke('store:get-book', id),
  getAnnotations: (id: string) => ipcRenderer.invoke('store:get-annotations', id),
  saveBook: (book: unknown, source?: unknown) => ipcRenderer.invoke('store:save-book', book, source),
  saveAnnotations: (ann: unknown) => ipcRenderer.invoke('store:save-annotations', ann),
  getSource: (id: string) => ipcRenderer.invoke('store:get-source', id),
  replaceBook: (book: unknown, ann: unknown) => ipcRenderer.invoke('store:replace-book', book, ann),
  reveal: (id: string) => ipcRenderer.invoke('store:reveal', id),
  deleteBook: (id: string) => ipcRenderer.invoke('store:delete-book', id),
});

// Your own writing. Shape matches WritingStore in src/writing/writing-store.ts.
contextBridge.exposeInMainWorld('bookCarveWriting', {
  listWorks: () => ipcRenderer.invoke('writing:list-works'),
  getWork: (id: string) => ipcRenderer.invoke('writing:get-work', id),
  saveWork: (work: unknown) => ipcRenderer.invoke('writing:save-work', work),
  getText: (workId: string, part: string) => ipcRenderer.invoke('writing:get-text', workId, part),
  saveText: (workId: string, part: string, text: string) => ipcRenderer.invoke('writing:save-text', workId, part, text),
  removePart: (workId: string, partId: string) => ipcRenderer.invoke('writing:remove-part', workId, partId),
  deleteWork: (id: string) => ipcRenderer.invoke('writing:delete-work', id),
  reveal: (id: string) => ipcRenderer.invoke('writing:reveal', id),
  getIdeas: () => ipcRenderer.invoke('writing:get-ideas'),
  saveIdeas: (ideas: unknown) => ipcRenderer.invoke('writing:save-ideas', ideas),
  getAtlas: (worldId: string) => ipcRenderer.invoke('writing:get-atlas', worldId),
});
