const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

// Create Desktop Shortcut logic for portable app
async function createDesktopShortcut() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const desktopPath = path.join(os.homedir(), 'Desktop', 'Code Alfacomp.lnk');
    try {
      await fs.access(desktopPath);
    } catch (err) {
      // Shortcut doesn't exist, we could create it here using a script or just notify
      // For now, we'll just log it. In a real app, you'd use a library like 'windows-shortcuts'
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Code Alfacomp IDE",
    icon: path.join(__dirname, '../public/vite.svg'), // Placeholder icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#1a1a2e',
  });

  // In development, load from the Vite dev server
  // In production, load the built index.html
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  win.loadURL(startUrl);

  // Hide the default menu bar
  win.setMenuBarVisibility(false);
}

// Start the Python Runner Server (WebSocket)
function startRunnerServer() {
  try {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 3001 });
    console.log('Integrated Python Runner Server running on ws://127.0.0.1:3001');

    wss.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn('Port 3001 already in use. Assuming another instance of Code Alfacomp is running or server is already started.');
      } else {
        console.error('WebSocket Server Error:', err);
      }
    });

    wss.on('connection', (ws) => {
      let pyProcess = null;
      let tempDir = null;

      const cleanup = async () => {
        if (pyProcess) {
          pyProcess.kill();
          pyProcess = null;
        }
        if (tempDir) {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (err) {}
          tempDir = null;
        }
      };

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          // ── NEW: Shell command handler (pip install, etc.) ──────────────
          if (data.type === 'shell') {
            const cmd = (data.command || '').trim();
            if (!cmd) {
              ws.send(JSON.stringify({ type: 'output', data: 'Пустая команда\r\n' }));
              return;
            }

            // Security: only allow safe commands
            const allowed = /^(pip\s|pip3\s|python\s|python3\s|node\s|npm\s|npx\s|ls|dir|echo|pwd|cd\s)/i.test(cmd);
            if (!allowed) {
              ws.send(JSON.stringify({ type: 'error', data: `Команда не разрешена: ${cmd}\r\n` }));
              return;
            }

            const shellProc = spawn(cmd.split(' ')[0], cmd.split(' ').slice(1), {
              shell: true,
              cwd: os.homedir(),
              env: { ...process.env }
            });

            shellProc.stdout.on('data', (d) => {
              ws.send(JSON.stringify({ type: 'output', data: d.toString() }));
            });
            shellProc.stderr.on('data', (d) => {
              ws.send(JSON.stringify({ type: 'output', data: d.toString() }));
            });
            shellProc.on('close', (code) => {
              ws.send(JSON.stringify({ type: 'output', data: `\r\n[Завершено с кодом ${code}]\r\n` }));
            });
            return;
          }
          // ──────────────────────────────────────────────────────────────

          if (data.type === 'init') {
            await cleanup();
            const { code, files, interactive } = data;
            const uniqueId = crypto.randomBytes(16).toString('hex');
            tempDir = path.join(os.tmpdir(), `py-runner-${uniqueId}`);
            await fs.mkdir(tempDir, { recursive: true });

            if (files && Array.isArray(files)) {
              for (const file of files) {
                const filePath = path.join(tempDir, file.path);
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, file.content, 'utf8');
              }
            }

            const scriptPath = path.join(tempDir, 'main.py');
            await fs.writeFile(scriptPath, code, 'utf8');

            const args = ['-u'];
            if (interactive) args.push('-i');
            args.push('main.py');

            pyProcess = spawn('python', args, { cwd: tempDir });

            pyProcess.stdout.on('data', (d) => {
              ws.send(JSON.stringify({ type: 'output', data: d.toString() }));
            });

            pyProcess.stderr.on('data', (d) => {
              ws.send(JSON.stringify({ type: 'error', data: d.toString() }));
            });

            pyProcess.on('close', (code) => {
              ws.send(JSON.stringify({ type: 'close', exitCode: code }));
              cleanup();
            });
          } else if (data.type === 'input') {
            if (pyProcess && pyProcess.stdin) {
              pyProcess.stdin.write(data.data + '\n');
            }
          } else if (data.type === 'kill') {
            await cleanup();
            ws.send(JSON.stringify({ type: 'close', exitCode: -1 }));
          }
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', data: err.message + '\r\n' }));
        }
      });

      ws.on('close', cleanup);
    });
  } catch (err) {
    console.error('Failed to start WebSocket server:', err);
  }
}

app.whenReady().then(() => {
  startRunnerServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
