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
  deleteBook: (id: string) => ipcRenderer.invoke('store:delete-book', id),
});
