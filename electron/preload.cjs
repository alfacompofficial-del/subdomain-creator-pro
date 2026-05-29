const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // We can add IPC methods here if we need direct system access
  // For now, TerminalApp still uses WebSockets to 127.0.0.1:3001
  // which is handled by the main process startRunnerServer()
});
