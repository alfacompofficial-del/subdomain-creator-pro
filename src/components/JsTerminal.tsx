import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Loader2, Sparkles } from 'lucide-react';
import { getCodeFix } from '@/lib/gemini';
import { toast } from 'sonner';

interface JsTerminalProps {
  code: string;
  onCodeFix?: (newCode: string) => void;
}

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info' | 'result' | 'system';
  text: string;
  time: string;
}

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }
  return String(v);
}

export default function JsTerminal({ code, onCodeFix }: JsTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'system', text: '✓ JavaScript (Node-style) Terminal готов. Нажмите ▶ Запустить.', time: '' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], ...args: unknown[]) => {
    const text = args.map(formatValue).join(' ');
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { type, text, time }]);
  };

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLastError(null);

    setLogs(prev => [
      ...prev,
      { type: 'system', text: '▶ Выполнение скрипта...', time: new Date().toLocaleTimeString('ru-RU') }
    ]);

    // Patch console
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    const origInfo = console.info;

    const _logs: LogEntry[] = [];
    const _time = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    console.log = (...args: unknown[]) => { _logs.push({ type: 'log', text: args.map(formatValue).join(' '), time: _time() }); };
    console.warn = (...args: unknown[]) => { _logs.push({ type: 'warn', text: args.map(formatValue).join(' '), time: _time() }); };
    console.error = (...args: unknown[]) => { _logs.push({ type: 'error', text: args.map(formatValue).join(' '), time: _time() }); };
    console.info = (...args: unknown[]) => { _logs.push({ type: 'info', text: args.map(formatValue).join(' '), time: _time() }); };

    try {
      // Run user code via AsyncFunction to support await at top-level
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(code);
      const result = await fn();

      // If there's an explicit return value, log it
      if (result !== undefined) {
        _logs.push({ type: 'result', text: `← ${formatValue(result)}`, time: _time() });
      }

      _logs.push({ type: 'system', text: '✓ Скрипт завершён', time: _time() });
      setLastError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      _logs.push({ type: 'error', text: `✗ ${msg}`, time: _time() });
      setLastError(msg);
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      console.info = origInfo;
      setLogs(prev => [...prev, ..._logs]);
      setIsRunning(false);
    }
  }, [code, isRunning]);

  const handleEvalLine = useCallback(async () => {
    if (!inputValue.trim()) return;
    const line = inputValue.trim();
    setInputValue('');
    setLogs(prev => [...prev, { type: 'system', text: `> ${line}`, time: new Date().toLocaleTimeString('ru-RU') }]);

    const origLog = console.log;
    const _logs: LogEntry[] = [];
    const _time = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log = (...args: unknown[]) => { _logs.push({ type: 'log', text: args.map(formatValue).join(' '), time: _time() }); };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(`return (${line})`);
      const result = await fn();
      if (result !== undefined) {
        _logs.push({ type: 'result', text: `← ${formatValue(result)}`, time: _time() });
      }
    } catch {
      try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(line);
        await fn();
      } catch (err2: unknown) {
        _logs.push({ type: 'error', text: String(err2 instanceof Error ? err2.message : err2), time: _time() });
      }
    } finally {
      console.log = origLog;
      setLogs(prev => [...prev, ..._logs]);
    }
  }, [inputValue]);

  const handleFixWithAI = useCallback(async () => {
    if (!lastError || !onCodeFix || isFixing) return;
    setIsFixing(true);
    addLog('system', '🤖 AI анализирует ошибку...');
    try {
      const fixed = await getCodeFix(code, lastError, 'javascript');
      if (fixed && fixed.trim() && fixed !== code) {
        onCodeFix(fixed);
        setLastError(null);
        addLog('system', '✓ Код исправлен. Запустите снова.');
        toast.success('AI исправил код в редакторе');
      } else {
        addLog('warn', '⚠ AI не смог найти исправление.');
        toast.error('AI не смог исправить ошибку');
      }
    } catch {
      addLog('error', '✗ Ошибка при обращении к AI.');
    } finally {
      setIsFixing(false);
    }
  }, [code, lastError, onCodeFix, isFixing]);

  const colorMap: Record<LogEntry['type'], string> = {
    log: 'text-white/90',
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    result: 'text-emerald-400',
    system: 'text-cyan-400/80',
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a2e] overflow-hidden rounded-md border border-border/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-xs font-mono text-white/70">JavaScript (Browser)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm" variant="ghost"
            onClick={() => setLogs([{ type: 'system', text: '🗑 Консоль очищена.', time: '' }])}
            className="h-7 text-xs text-white/50 hover:text-white/80 hover:bg-white/10"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          {lastError && onCodeFix && (
            <Button
              size="sm"
              onClick={handleFixWithAI}
              disabled={isFixing}
              className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
            >
              {isFixing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Исправить с AI
            </Button>
          )}
          {isRunning ? (
            <Button size="sm" variant="destructive" disabled className="h-7 text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Выполнение...
            </Button>
          ) : (
            <Button size="sm" onClick={handleRun} className="h-7 text-xs bg-yellow-600 hover:bg-yellow-500 text-white">
              <Play className="w-3 h-3 mr-1" />
              Запустить
            </Button>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className={`flex items-start gap-2 ${colorMap[log.type]}`}>
            {log.time && <span className="shrink-0 text-white/20 text-[10px] pt-px">{log.time}</span>}
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{log.text}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* REPL input */}
      <div className="shrink-0 border-t border-white/10 flex items-center gap-2 px-3 py-2 bg-[#16213e]">
        <span className="text-yellow-400 font-mono text-xs select-none">&gt;</span>
        <input
          className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder:text-white/20"
          placeholder="Введите выражение..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEvalLine()}
        />
        <button
          onClick={handleEvalLine}
          className="text-white/30 hover:text-white/70 text-xs"
          title="Выполнить (Enter)"
        >↵</button>
      </div>
    </div>
  );
}
