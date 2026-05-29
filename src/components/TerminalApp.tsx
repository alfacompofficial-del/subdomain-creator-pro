import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Loader2, Trash2, Sparkles, Server, Package, Send } from 'lucide-react';
import { getCodeFix } from '@/lib/gemini';
import { toast } from 'sonner';

declare global {
  interface Window {
    loadPyodide: (config: any) => Promise<any>;
  }
}

interface TerminalAppProps {
  code: string;
  rootHandle?: any;
  onCodeFix?: (newCode: string) => void;
}

export default function TerminalApp({ code, rootHandle, onCodeFix }: TerminalAppProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pyodideRef = useRef<any>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  // Shell command state (pip install, etc.)
  const [shellCmd, setShellCmd] = useState('');
  const [isShellRunning, setIsShellRunning] = useState(false);
  const [showPipPanel, setShowPipPanel] = useState(false);

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
        background: 'transparent',
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

    term.writeln('\x1b[38;2;0;212;255m╔═════════════════════════════════════╗\x1b[0m');
    term.writeln(`\x1b[38;2;0;212;255m║  📦 Подготовка WebAssembly Python...║\x1b[0m`);
    term.writeln('\x1b[38;2;0;212;255m╚═════════════════════════════════════╝\x1b[0m');

    const initPyodide = async () => {
      try {
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Pyodide script"));
            document.body.appendChild(script);
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
          stdout: (text: string) => {
            termInstanceRef.current?.write(text.replace(/\r?\n/g, '\r\n') + '\r\n');
          },
          stderr: (text: string) => {
            termInstanceRef.current?.write('\x1b[38;2;255;107;107m' + text.replace(/\r?\n/g, '\r\n') + '\x1b[0m\r\n');
            setLastError(text);
          }
        });

        await pyodide.loadPackage("micropip");
        pyodideRef.current = pyodide;
        setIsReady(true);
        term.writeln('\x1b[38;2;81;207;102m✓ Python (Pyodide) успешно загружен в браузере!\x1b[0m');
        term.writeln('\x1b[38;2;116;192;252m  Можно запускать код. Бэкенд сервер больше не нужен.\x1b[0m\r\n');
      } catch (err: any) {
        term.writeln(`\x1b[38;2;255;107;107m✗ Ошибка загрузки Pyodide: ${err.message}\x1b[0m`);
      }
    };

    initPyodide();

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => fitAddon.fit()));
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (!pyodideRef.current) {
      toast.error("Python еще не загрузился!");
      return;
    }
    
    setIsRunning(true);
    const term = termInstanceRef.current;
    if(!term) return;
    
    term.clear();
    setLastError(null);
    
    term.writeln('\x1b[38;2;0;212;255m>>> Синхронизация файлов...\x1b[0m');
    document.body.style.cursor = 'wait';

    try {
      const files = await readWorkspaceFiles(rootHandle);
      
      term.writeln(`\x1b[38;2;116;192;252m>>> Загружено файлов: ${files.length}\x1b[0m`);
      
      // Write files to virtual FS
      files.forEach(f => {
        try {
          const parts = f.path.split('/');
          let currentPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath += '/' + parts[i];
            try { pyodideRef.current.FS.mkdir(currentPath); } catch (e) {}
          }
          pyodideRef.current.FS.writeFile('/' + f.path, f.content);
        } catch (e) {}
      });

      term.writeln('\x1b[38;2;0;212;255m>>> Запуск скрипта...\x1b[0m\r\n');
      
      // Run Python Code
      await pyodideRef.current.runPythonAsync(code);
      term.writeln(`\r\n\x1b[38;2;81;207;102m[Процесс завершен успешно]\x1b[0m`);
    } catch (err: any) {
      term.writeln(`\r\n\x1b[38;2;255;107;107m[Ошибка выполнения]\x1b[0m`);
      term.writeln('\x1b[38;2;116;192;252m💡 Нажмите "Исправить с AI" чтобы AI проанализировал ошибку.\x1b[0m');
      // Set last error is automatically done by stderr callback or catch
      if (!lastError) setLastError(err.message || String(err));
    } finally {
      setIsRunning(false);
      document.body.style.cursor = 'default';
    }
  }, [code, rootHandle, lastError]);

  const handleStop = useCallback(() => {
    if (isRunning && pyodideRef.current) {
      toast.info("Остановка кода в WebAssembly пока не поддерживается.");
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

  const handleShellCommand = useCallback(async (cmdOverride?: string) => {
    const cmd = (cmdOverride || shellCmd).trim();
    if (!cmd || !pyodideRef.current) return;

    const term = termInstanceRef.current;
    setIsShellRunning(true);
    term?.writeln(`\r\n\x1b[38;2;0;212;255m$ ${cmd}\x1b[0m`);

    try {
      if (cmd.startsWith('pip install ')) {
        const pkg = cmd.split('pip install ')[1].trim();
        term?.writeln(`Установка пакета ${pkg} через micropip...`);
        await pyodideRef.current.runPythonAsync(`
import micropip
await micropip.install('${pkg}')
        `);
        term?.writeln(`\x1b[38;2;81;207;102m✓ ${pkg} успешно установлен\x1b[0m`);
      } else {
        term?.writeln(`\x1b[38;2;255;212;59m⚠ В режиме WebAssembly поддерживается только установка пакетов (pip install).\x1b[0m`);
      }
    } catch (e: any) {
      term?.writeln(`\x1b[38;2;255;107;107m✗ Ошибка: ${e.message}\x1b[0m`);
    } finally {
      setIsShellRunning(false);
      setShellCmd('');
    }
  }, [shellCmd]);

  const QUICK_COMMANDS = [
    { label: 'requests', cmd: 'pip install requests' },
    { label: 'numpy', cmd: 'pip install numpy' },
    { label: 'pandas', cmd: 'pip install pandas' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-card overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-xs font-mono text-white/70 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            {isReady ? 'Pyodide (Браузер)' : 'Загрузка Python...'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowPipPanel(v => !v)}
            className={`h-7 text-xs hover:bg-white/10 ${showPipPanel ? 'text-amber-400 bg-amber-500/10' : 'text-white/50 hover:text-white/80'}`}
            title="Установка библиотек"
          >
            <Package className="w-3 h-3 mr-1" />
            Пакеты
          </Button>
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
              Выполняется...
            </Button>
          ) : (
            <Button size="sm" onClick={handleRun} disabled={!isReady} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              <Play className="w-3 h-3 mr-1" />
              Запустить
            </Button>
          )}
        </div>
      </div>

      {showPipPanel && (
        <div className="bg-background/80 border-b border-amber-500/20 px-3 py-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
            <Package className="w-3 h-3" />
            Установка библиотек (micropip)
          </div>
          <div className="flex gap-2">
            <Input
              value={shellCmd}
              onChange={e => setShellCmd(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleShellCommand(); }}
              placeholder="pip install requests"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono"
            />
            <Button
              size="sm"
              onClick={() => handleShellCommand()}
              disabled={!shellCmd.trim() || !isReady || isShellRunning}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white shrink-0"
            >
              {isShellRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_COMMANDS.map(qc => (
              <button
                key={qc.cmd}
                onClick={() => handleShellCommand(qc.cmd)}
                disabled={!isReady || isShellRunning}
                className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 transition-colors disabled:opacity-40"
              >
                {qc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 p-1 h-full overflow-hidden" ref={terminalRef} />
    </div>
  );
}
