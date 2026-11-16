import { contextBridge, ipcRenderer } from 'electron';

// The floating button only reports presses; the main process decides drag versus click.
contextBridge.exposeInMainWorld('bubble', {
  down: () => ipcRenderer.send('bubble:down'),
  up: () => ipcRenderer.send('bubble:up'),
  menu: () => ipcRenderer.send('bubble:menu'),
});
