const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const wss = new WebSocketServer({ port: 3001 });

console.log('Python Runner Server running on ws://localhost:3001');

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
        console.log(`Cleaned up temp dir: ${tempDir}`);
      } catch (err) {
        console.error(`Error cleaning up ${tempDir}:`, err);
      }
      tempDir = null;
    }
  };

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'init') {
        // Cleanup previous execution if any
        await cleanup();

        const { code, files, interactive } = data;

        // Create a unique temporary directory
        const uniqueId = crypto.randomBytes(16).toString('hex');
        tempDir = path.join(os.tmpdir(), `py-runner-${uniqueId}`);
        await fs.mkdir(tempDir, { recursive: true });
        console.log(`Created workspace: ${tempDir}`);

        // Write user files
        if (files && Array.isArray(files)) {
          for (const file of files) {
            const filePath = path.join(tempDir, file.path);
            // Ensure subdirectories exist
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content, 'utf8');
          }
        }

        // Write the main script
        const scriptPath = path.join(tempDir, 'main.py');
        await fs.writeFile(scriptPath, code, 'utf8');

        // Spawn python process
        // -u forces unbuffered output so print() sends data immediately
        // -i keeps the process interactive after script finishes
        const args = ['-u'];
        if (interactive) {
          args.push('-i');
        }
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
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', data: err.message + '\r\n' }));
    }
  });

  ws.on('close', () => {
    cleanup();
  });
});
