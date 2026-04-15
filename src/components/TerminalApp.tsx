import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';

interface TerminalAppProps {
  code: string;
}

declare global {
  interface Window {
    loadPyodide: (config?: any) => Promise<any>;
  }
}

export default function TerminalApp({ code }: TerminalAppProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const pyodideRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const abortRef = useRef(false);

  // Load Pyodide once
  useEffect(() => {
    let cancelled = false;

    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.loadPyodide) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(s);
      });
    };

    (async () => {
      try {
        await loadScript();
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
        });
        if (!cancelled) {
          pyodideRef.current = pyodide;
          setIsLoading(false);
          setOutput(['[Python загружен и готов к работе]']);
        }
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          setOutput([`[Ошибка загрузки Python: ${err}]`]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleRun = useCallback(async () => {
    const pyodide = pyodideRef.current;
    if (!pyodide || isRunning) return;

    setIsRunning(true);
    abortRef.current = false;
    setOutput([]);

    try {
      // Redirect stdout/stderr
      pyodide.runPython(`
import sys, io

class OutputCapture:
    def __init__(self):
        self.data = []
    def write(self, text):
        if text:
            self.data.append(text)
    def flush(self):
        pass
    def get_and_clear(self):
        result = self.data[:]
        self.data = []
        return result

_capture = OutputCapture()
sys.stdout = _capture
sys.stderr = _capture
`);

      // Run user code
      await pyodide.runPythonAsync(code);

      // Get output
      const captured = pyodide.runPython('_capture.get_and_clear()').toJs();
      const lines: string[] = [];
      for (const chunk of captured) {
        lines.push(String(chunk));
      }
      setOutput(prev => [...prev, ...lines]);
    } catch (err: any) {
      setOutput(prev => [...prev, `\n❌ Ошибка:\n${err.message || err}`]);
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning]);

  const handleInstallPackage = useCallback(async (pkg: string) => {
    const pyodide = pyodideRef.current;
    if (!pyodide) return;
    setOutput(prev => [...prev, `📦 Установка ${pkg}...`]);
    try {
      await pyodide.loadPackage('micropip');
      const micropip = pyodide.pyimport('micropip');
      await micropip.install(pkg);
      setOutput(prev => [...prev, `✅ ${pkg} установлен`]);
    } catch (err: any) {
      setOutput(prev => [...prev, `❌ Ошибка установки ${pkg}: ${err.message}`]);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden rounded-md border border-border/40">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            {isLoading ? 'Загрузка Python...' : 'Python готов'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={() => { abortRef.current = true; }} className="h-7 text-xs">
              <Square className="w-3 h-3 mr-1" />
              Остановить
            </Button>
          ) : (
            <Button size="sm" variant="hero" onClick={handleRun} disabled={isLoading} className="h-7 text-xs">
              {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Запустить
            </Button>
          )}
        </div>
      </div>
      <div
        ref={outputRef}
        className="flex-1 p-3 overflow-auto font-mono text-sm text-green-400 whitespace-pre-wrap"
        style={{ background: '#1e1e1e' }}
      >
        {output.length === 0 && !isRunning && !isLoading && (
          <span className="text-white/30">Нажмите «Запустить» для выполнения кода</span>
        )}
        {output.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
        {isRunning && <span className="animate-pulse text-yellow-400">▌ Выполняется...</span>}
      </div>
    </div>
  );
}
