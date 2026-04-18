import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Trash2 } from 'lucide-react';

interface TerminalAppProps {
  code: string;
}

declare global {
  interface Window {
    loadPyodide: (config?: any) => Promise<any>;
  }
}

export default function TerminalApp({ code }: TerminalAppProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pyodideRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inputResolveRef = useRef<((value: string) => void) | null>(null);
  const inputBufferRef = useRef('');

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
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    if (terminalRef.current) {
      term.open(terminalRef.current);
      requestAnimationFrame(() => fitAddon.fit());
    }
    termInstanceRef.current = term;

    // Handle keyboard input for input() support
    term.onKey(({ key, domEvent }) => {
      if (!inputResolveRef.current) return;
      
      if (domEvent.key === 'Enter') {
        term.write('\r\n');
        const value = inputBufferRef.current;
        inputBufferRef.current = '';
        inputResolveRef.current(value);
        inputResolveRef.current = null;
      } else if (domEvent.key === 'Backspace') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
        inputBufferRef.current += key;
        term.write(key);
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
        // Removed micropip pre-loading to speed up initialization
        // await pyodide.loadPackage('micropip');
        
        pyodideRef.current = pyodide;
        term.clear();
        term.writeln('\x1b[38;2;81;207;102m✓ Python 3.11 готов к работе\x1b[0m');
        term.writeln('\x1b[38;2;116;192;252m  Поддержка: стандартная библиотека (import)\x1b[0m');
        term.writeln('\x1b[38;2;116;192;252m  input() работает в терминале\x1b[0m');
        term.writeln('');
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
    term.clear();
    term.writeln('\x1b[38;2;0;212;255m>>> Выполнение...\x1b[0m\r\n');

    // Setup stdout/stderr
    pyodide.setStdout({
      batched: (str: string) => term.write(str + '\r\n')
    });
    pyodide.setStderr({
      batched: (str: string) => term.write('\x1b[38;2;255;107;107m' + str + '\x1b[0m\r\n')
    });

    // Patch input() to use the browser's native prompt
    pyodide.runPython(`
import sys
import builtins
import js

def _sync_input(prompt_text=""):
    # Use standard window.prompt
    result = js.window.prompt(prompt_text)
    if result is None:
        result = ""
        
    # Echo back to terminal so user sees what they entered
    if prompt_text:
        sys.stdout.write(prompt_text + str(result) + "\\n")
    else:
        sys.stdout.write(str(result) + "\\n")
        
    return str(result)

builtins.input = _sync_input
`);

    try {
      await pyodide.runPythonAsync(code);
      term.writeln('\r\n\x1b[38;2;81;207;102m[Программа завершена]\x1b[0m');
    } catch (err: any) {
      const msg = err.message || String(err);
      
      // Clean up Pyodide stack traces
      let cleanMsg = msg;
      if (msg.includes('Traceback')) {
        const lines = msg.split('\n');
        const userLines = [];
        for (const line of lines) {
          if (line.includes('File "/lib/python') || line.includes('pyodide.ffi')) {
            continue; // skip internal stack layers
          }
          userLines.push(line);
        }
        cleanMsg = userLines.join('\n').replace(/PythonError: /g, '').trim();
      } else {
        cleanMsg = msg.replace(/PythonError: /g, '').trim();
      }
      
      term.writeln('\x1b[38;2;255;107;107m\r\n[Ошибка]:\x1b[0m');
      term.writeln('\x1b[38;2;255;135;135m' + cleanMsg + '\x1b[0m');
    } finally {
      inputResolveRef.current = null;
      inputBufferRef.current = '';
      setIsRunning(false);
    }
  }, [code]);

  const handleClear = useCallback(() => {
    termInstanceRef.current?.clear();
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
