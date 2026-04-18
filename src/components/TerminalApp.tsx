import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Trash2 } from 'lucide-react';

interface TerminalAppProps {
  code: string;
  onError?: (err: string) => void;
}

declare global {
  interface Window {
    loadPyodide: (config?: any) => Promise<any>;
    termWrite: (text: string) => void;
    reportPythonError: (text: string) => void;
  }
}

export default function TerminalApp({ code, onError }: TerminalAppProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pyodideRef = useRef<any>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const inputBufferRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyPosRef = useRef<number>(-1);

  // Helper to evaluate a line in the Python REPL
  const evaluateLine = async (line: string) => {
    try {
      const pyodide = pyodideRef.current;
      if (!pyodide) return;
      // .push() compiles and runs the line, returns True if it expects more
      const isMore = await pyodide.runPythonAsync(`_repl_console.push(${JSON.stringify(line)})`);
      if (isMore) {
        termInstanceRef.current?.write('... ');
      } else {
        termInstanceRef.current?.write('>>> ');
      }
    } catch (err: any) {
      // InteractiveConsole internally prints Tracebacks to sys.stderr (which we captured)
      termInstanceRef.current?.write('>>> ');
    }
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
        brightBlack: '#495057',
        brightRed: '#ff8787',
        brightGreen: '#69db7c',
        brightYellow: '#ffe066',
        brightBlue: '#91d5ff',
        brightMagenta: '#e599f7',
        brightCyan: '#99e9f2',
        brightWhite: '#f8f9fa',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorStyle: 'bar',
      cursorWidth: 2,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    if (terminalRef.current) {
      term.open(terminalRef.current);
      requestAnimationFrame(() => fitAddon.fit());
    }
    termInstanceRef.current = term;

    // Local JS function to accept stdout from Python
    window.termWrite = (text: string) => {
      // Replace single \n with \r\n to ensure xterm wraps lines properly
      termInstanceRef.current?.write(text.replace(/\r?\n/g, '\r\n'));
    };

    window.reportPythonError = (text: string) => {
      if (onError) onError(text);
    };

    term.onKey(({ key, domEvent }) => {
      // Ignore input if Pyodide isn't loaded or a script is currently running
      if (!pyodideRef.current || document.body.style.cursor === 'wait') return;
      
      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) { // Enter
        const line = inputBufferRef.current;
        term.write('\r\n');
        inputBufferRef.current = '';
        if (line.trim()) {
          historyRef.current.push(line);
          historyPosRef.current = historyRef.current.length;
        }
        evaluateLine(line);
      } else if (ev.keyCode === 8) { // Backspace
        if (inputBufferRef.current.length > 0) {
          term.write('\b \b');
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        }
      } else if (ev.keyCode === 38) { // Arrow Up
        if (historyPosRef.current > 0) {
          historyPosRef.current -= 1;
          const hist = historyRef.current[historyPosRef.current];
          while (inputBufferRef.current.length > 0) {
            term.write('\b \b');
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          }
          term.write(hist);
          inputBufferRef.current = hist;
        }
      } else if (ev.keyCode === 40) { // Arrow Down
        if (historyPosRef.current < historyRef.current.length - 1) {
          historyPosRef.current += 1;
          const hist = historyRef.current[historyPosRef.current];
          while (inputBufferRef.current.length > 0) {
            term.write('\b \b');
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          }
          term.write(hist);
          inputBufferRef.current = hist;
        } else if (historyPosRef.current === historyRef.current.length - 1) {
          historyPosRef.current += 1;
          while (inputBufferRef.current.length > 0) {
            term.write('\b \b');
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          }
        }
      } else if (printable && key.length === 1) {
        term.write(key);
        inputBufferRef.current += key;
      }
    });

    const loadPyodideScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.loadPyodide) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(s);
      });
    };

    const initPyodide = async () => {
      try {
        term.writeln('\x1b[38;2;0;212;255m╔══════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[38;2;0;212;255m║  🐍 Загрузка Python...          ║\x1b[0m');
        term.writeln('\x1b[38;2;0;212;255m╚══════════════════════════════════╝\x1b[0m');
        
        await loadPyodideScript();
        
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
        
        // Define terminal I/O streams and setup the REPL console
        pyodide.runPython(`
import sys
import js
import code
import builtins

class JSTermOut:
    def write(self, data):
        js.termWrite(data)
    def flush(self):
        pass

# Redirect all stdout/stderr to xterm.js
sys.stdout = JSTermOut()
sys.stderr = JSTermOut()

def _sync_input(prompt_text=""):
    result = js.window.prompt(prompt_text)
    if result is None:
        result = ""
    if prompt_text:
        sys.stdout.write(str(prompt_text) + str(result) + "\\n")
    else:
        sys.stdout.write(str(result) + "\\n")
    return str(result)

builtins.input = _sync_input

def my_excepthook(exctype, value, tb):
    import traceback
    err_lines = traceback.format_exception(exctype, value, tb)
    err_text = "".join(err_lines)
    sys.stderr.write(err_text)
    js.window.reportPythonError(err_text)

sys.excepthook = my_excepthook

# Create a global REPL instance
_repl_console = code.InteractiveConsole()
`);

        pyodideRef.current = pyodide;
        term.clear();
        term.writeln('\x1b[38;2;81;207;102m✓ Python 3.11 готов к работе\x1b[0m');
        term.writeln('\x1b[38;2;116;192;252m  Для выполнения команд введите их ниже.\x1b[0m');
        term.writeln('');
        term.write('>>> ');
        
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        term.writeln('\x1b[38;2;255;107;107m✗ Ошибка загрузки: ' + error + '\x1b[0m');
        setIsLoading(false);
      }
    };

    initPyodide();

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => fitAddon.fit());
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (!pyodideRef.current || !termInstanceRef.current) return;
    
    setIsRunning(true);
    const term = termInstanceRef.current;
    const pyodide = pyodideRef.current;
    
    // We clear to keep it clean, but write what we are doing
    term.clear();
    term.writeln('\x1b[38;2;0;212;255m>>> Выполнение скрипта...\x1b[0m');

    document.body.style.cursor = 'wait'; // Prevent terminal input effectively

    try {
      await pyodide.runPythonAsync(code);
      term.writeln('\r\n\x1b[38;2;81;207;102m[Программа завершена]\x1b[0m');
      term.write('>>> ');
    } catch (err: any) {
      const msg = err.message || String(err);
      
      let cleanMsg = msg;
      if (msg.includes('Traceback')) {
        const lines = msg.split('\n');
        const userLines = [];
        for (const line of lines) {
          if (line.includes('File "/lib/python') || line.includes('pyodide.ffi')) continue;
          userLines.push(line);
        }
        cleanMsg = userLines.join('\n').replace(/PythonError: /g, '').trim();
      } else {
        cleanMsg = msg.replace(/PythonError: /g, '').trim();
      }
      
      term.writeln('\x1b[38;2;255;107;107m\r\n[Ошибка]:\x1b[0m');
      term.writeln('\x1b[38;2;255;135;135m' + cleanMsg + '\x1b[0m');
      term.write('\r\n>>> ');
      if (onError) {
        onError(cleanMsg);
      }
    } finally {
      document.body.style.cursor = 'default';
      inputBufferRef.current = '';
      setIsRunning(false);
    }
  }, [code]);

  const handleClear = useCallback(() => {
    termInstanceRef.current?.clear();
    termInstanceRef.current?.write('>>> ');
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a2e] overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-xs font-mono text-white/70">
            {isLoading ? 'Загрузка Python...' : (isReady ? 'Python 3.11 (Pyodide)' : 'Ошибка')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 text-xs text-white/50 hover:text-white/80 hover:bg-white/10">
            <Trash2 className="w-3 h-3" />
          </Button>
          {isRunning ? (
            <Button size="sm" variant="destructive" disabled className="h-7 text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Выполнение...
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
