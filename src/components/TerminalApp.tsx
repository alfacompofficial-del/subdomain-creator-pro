import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Play, Loader2, Square } from 'lucide-react';

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
  const pyodideRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Pyodide and Initialize Terminal
  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }
    termInstanceRef.current = term;

    const loadPyodideScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.loadPyodide) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(s);
      });
    };

    const initPyodide = async () => {
      try {
        term.writeln('\x1b[33m[Загрузка Python в браузере...]\x1b[0m');
        await loadPyodideScript();
        
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
        
        pyodideRef.current = pyodide;
        term.writeln('\x1b[32m[Python готов к работе!]\x1b[0m');
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        term.writeln('\x1b[31m[Ошибка загрузки Python: ' + error + ']\x1b[0m');
        setIsLoading(false);
      }
    };

    initPyodide();

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const handleRun = async () => {
    if (!pyodideRef.current || !termInstanceRef.current) return;
    
    setIsRunning(true);
    const term = termInstanceRef.current;
    term.clear();
    term.writeln('\x1b[36m>>> Выполнение скрипта...\x1b[0m');

    // Redirect stdout/stderr to xterm
    pyodideRef.current.setStdout({
      batched: (str: string) => term.write(str + '\r\n')
    });
    
    pyodideRef.current.setStderr({
      batched: (str: string) => term.write('\x1b[31m' + str + '\x1b[0m\r\n')
    });

    try {
      await pyodideRef.current.runPythonAsync(code);
      term.writeln('\x1b[32m\r\n[Программа завершена]\x1b[0m');
    } catch (err: any) {
      term.writeln('\x1b[31m\r\n[Ошибка выполнения]:\x1b[0m');
      term.writeln('\x1b[31m' + err.message || String(err) + '\x1b[0m');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isLoading ? 'Загрузка системы...' : (isReady ? 'Python (Браузер)' : 'Ошибка системы')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button size="sm" variant="destructive" disabled className="h-7 text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Выполнение...
            </Button>
          ) : (
            <Button size="sm" variant="hero" onClick={handleRun} disabled={!isReady} className="h-7 text-xs">
              <Play className="w-3 h-3 mr-1" />
              Запустить
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 p-2 h-full overflow-hidden" ref={terminalRef}></div>
    </div>
  );
}
