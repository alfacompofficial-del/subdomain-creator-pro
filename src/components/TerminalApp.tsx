import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Trash2, Sparkles, Server } from 'lucide-react';
import { getCodeFix } from '@/lib/gemini';
import { toast } from 'sonner';

interface TerminalAppProps {
  code: string;
  rootHandle?: any;
  onCodeFix?: (newCode: string) => void;
}

export default function TerminalApp({ code, rootHandle, onCodeFix }: TerminalAppProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  
  const inputBufferRef = useRef('');

  // Traverse local filesystem via FileSystemAccess API
  const readWorkspaceFiles = async (dirHandle: any, path = '') => {
    const files: { path: string, content: string }[] = [];
    if (!dirHandle) return files;
    
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (['node_modules', '.git', 'venv', '__pycache__', '.env'].includes(name)) continue;
        
        const p = path ? `${path}/${name}` : name;
        if (handle.kind === 'file') {
          const ext = name.split('.').pop()?.toLowerCase();
          if (['txt', 'py', 'js', 'html', 'css', 'json', 'csv', 'md'].includes(ext || '')) {
            const file = await handle.getFile();
            if (file.size < 2 * 1024 * 1024) { // max 2MB per file
              const content = await file.text();
              files.push({ path: p, content });
            }
          }
        } else if (handle.kind === 'directory') {
          const subFiles = await readWorkspaceFiles(handle, p);
          files.push(...subFiles);
        }
      }
    } catch (e) {
      console.warn("Could not read directory", path, e);
    }
    return files;
  };

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#00d4ff',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#00d4ff33',
        black: '#1a1a2e',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#ffd43b',
        blue: '#74c0fc',
        magenta: '#da77f2',
        cyan: '#66d9e8',
        white: '#e0e0e0',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorStyle: 'bar',
      cursorWidth: 2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    if (terminalRef.current) {
      term.open(terminalRef.current);
      requestAnimationFrame(() => fitAddon.fit());
    }
    termInstanceRef.current = term;

    const connectWS = () => {
      term.writeln('\x1b[38;2;0;212;255m╔══════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[38;2;0;212;255m║  🔌 Подключение к Localhost...   ║\x1b[0m');
      term.writeln('\x1b[38;2;0;212;255m╚══════════════════════════════════╝\x1b[0m');
      
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln('\x1b[38;2;81;207;102m✓ Подключено к локальному серверу Python\x1b[0m');
        term.writeln('\x1b[38;2;116;192;252m  Ожидание команд...\x1b[0m\r\n');
        setIsReady(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output') {
            term.write(data.data.replace(/\r?\n/g, '\r\n'));
          } else if (data.type === 'error') {
            term.write('\x1b[38;2;255;107;107m' + data.data.replace(/\r?\n/g, '\r\n') + '\x1b[0m');
            setLastError(data.data);
          } else if (data.type === 'close') {
            term.writeln(`\r\n\x1b[38;2;81;207;102m[Процесс завершен с кодом ${data.exitCode}]\x1b[0m`);
            if (data.exitCode !== 0) {
                term.writeln('\x1b[38;2;116;192;252m💡 Нажмите "Исправить с AI" чтобы AI проанализировал ошибку.\x1b[0m');
            }
            setIsRunning(false);
            document.body.style.cursor = 'default';
          }
        } catch(e){}
      };

      ws.onerror = () => {
        term.writeln('\x1b[38;2;255;107;107m✗ Ошибка подключения к серверу (ws://localhost:3001)\x1b[0m');
        term.writeln('Убедитесь, что вы запустили: node runner-server/server.js');
        setIsReady(false);
      };
      
      ws.onclose = () => {
        setIsReady(false);
      }
    };
    connectWS();

    term.onKey(({ key, domEvent }) => {
      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (isRunning && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (ev.keyCode === 13) { // Enter
          term.write('\r\n');
          wsRef.current.send(JSON.stringify({ type: 'input', data: inputBufferRef.current }));
          inputBufferRef.current = '';
        } else if (ev.keyCode === 8) { // Backspace
          if (inputBufferRef.current.length > 0) {
            term.write('\b \b');
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          }
        } else if (printable && key.length === 1) {
          term.write(key);
          inputBufferRef.current += key;
        }
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => fitAddon.fit()));
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Нет подключения к локальному серверу!");
      return;
    }
    
    setIsRunning(true);
    const term = termInstanceRef.current;
    if(!term) return;
    
    term.clear();
    setLastError(null);
    inputBufferRef.current = '';
    
    term.writeln('\x1b[38;2;0;212;255m>>> Синхронизация файлов с сервером...\x1b[0m');
    document.body.style.cursor = 'wait';

    try {
      const files = await readWorkspaceFiles(rootHandle);
      
      term.writeln(`\x1b[38;2;116;192;252m>>> Синхронизировано файлов: ${files.length}\x1b[0m`);
      if (files.length > 0) {
        term.writeln(`\x1b[38;2;116;192;252m    ${files.map(f => f.path).join(', ')}\x1b[0m`);
      }
      
      term.writeln('\x1b[38;2;0;212;255m>>> Запуск скрипта...\x1b[0m\r\n');
      wsRef.current.send(JSON.stringify({ type: 'init', code, files }));
    } catch (err: any) {
      term.writeln('\x1b[38;2;255;107;107m✗ Ошибка отправки файлов: ' + err.message + '\x1b[0m');
      setIsRunning(false);
      document.body.style.cursor = 'default';
    }
  }, [code, rootHandle]);

  const handleStop = useCallback(() => {
    if (isRunning && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
  }, [isRunning]);

  const handleFixWithAI = useCallback(async () => {
    if (!lastError || !onCodeFix || isFixing) return;
    setIsFixing(true);
    const term = termInstanceRef.current;
    term?.writeln('\x1b[38;2;116;192;252m\r\n🤖 AI анализирует ошибку...\x1b[0m');
    try {
      const fixed = await getCodeFix(code, lastError, 'python');
      if (fixed && fixed.trim() && fixed !== code) {
        onCodeFix(fixed);
        setLastError(null);
        term?.writeln('\x1b[38;2;81;207;102m✓ Код исправлен. Запустите снова.\x1b[0m');
      } else {
        term?.writeln('\x1b[38;2;255;212;59m⚠ AI не смог найти исправление.\x1b[0m');
        toast.error('AI не смог исправить ошибку');
      }
    } catch {
      term?.writeln('\x1b[38;2;255;107;107m✗ Ошибка при обращении к AI.\x1b[0m');
    } finally {
      setIsFixing(false);
    }
  }, [code, lastError, onCodeFix, isFixing]);

  const handleClear = () => {
    termInstanceRef.current?.clear();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a2e] overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
          <span className="text-xs font-mono text-white/70 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            {isReady ? 'Native Python (Local Server)' : 'Отключено'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 text-xs text-white/50 hover:text-white/80 hover:bg-white/10">
            <Trash2 className="w-3 h-3" />
          </Button>
          {lastError && onCodeFix && (
            <Button size="sm" onClick={handleFixWithAI} disabled={isFixing} className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white">
              {isFixing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Исправить с AI
            </Button>
          )}
          {isRunning ? (
            <Button size="sm" onClick={handleStop} className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Остановить
            </Button>
          ) : (
            <Button size="sm" onClick={handleRun} disabled={!isReady} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              <Play className="w-3 h-3 mr-1" />
              Запустить
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 p-1 h-full overflow-hidden" ref={terminalRef} />
    </div>
  );
}
