import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Send, Trash2, Github } from "lucide-react";
import { getAiEdit } from "@/lib/gemini";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface IdeAiPanelProps {
  currentCode: string;
  currentLang: string;
  fileName?: string;
  onApply: (code: string) => void;
  onSync?: () => Promise<void>;
}

// Groq key is set by the user in Settings → Appearance → AI Model
const GROQ_DEFAULT_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

export default function IdeAiPanel({ currentCode, currentLang, fileName, onApply, onSync }: IdeAiPanelProps) {
  const { aiProvider, setAiProvider, groqApiKey, setGroqApiKey } = useSettings();
  const aiName = aiProvider === "groq" ? "Groq AI" : "Gemini AI";
  const aiVersion = aiProvider === "groq" ? "Llama 3" : "2.5 Flash";

  // Ensure Groq key is set if switching to Groq
  useEffect(() => {
    if (aiProvider === "groq" && !groqApiKey) {
      setGroqApiKey(GROQ_DEFAULT_KEY);
    }
  }, [aiProvider, groqApiKey, setGroqApiKey]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: `Привет! Я ИИ-помощник на базе ${
        aiProvider === "groq" ? "Groq (Llama 3)" : "Gemini 2.5 Flash"
      }. Опишите что нужно сделать с кодом, и я помогу!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Switch AI provider and update chat greeting
  const switchProvider = (provider: "gemini" | "groq") => {
    setAiProvider(provider);
    if (provider === "groq" && !groqApiKey) {
      setGroqApiKey(GROQ_DEFAULT_KEY);
    }
    setMessages([
      {
        role: "ai",
        text: `Переключено на ${
          provider === "groq" ? "Groq AI (Llama 3)" : "Gemini 2.5 Flash"
        }. Чем помочь?`,
      },
    ]);
    toast.success(`ИИ: ${provider === "groq" ? "Groq AI" : "Gemini 2.5 Flash"}`);
  };

  // GitHub sync handler
  const handleSync = async () => {
    if (!onSync) {
      toast.error("GitHub не настроен. Добавьте токен в Настройки → Интеграции.");
      return;
    }
    setIsSyncing(true);
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: "Отправляю изменения в GitHub..." },
    ]);
    try {
      await onSync();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "✅ Изменения успешно отправлены в GitHub!" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "❌ Ошибка при отправке в GitHub. Проверьте настройки токена.",
        },
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const lowerMsg = userMsg.toLowerCase();
      const isGithubRequest =
        (lowerMsg.includes("github") || lowerMsg.includes("гитхаб")) &&
        (lowerMsg.includes("отправь") ||
          lowerMsg.includes("push") ||
          lowerMsg.includes("синхронизируй") ||
          lowerMsg.includes("залей"));

      if (isGithubRequest && onSync) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "Конечно! Сейчас подготовлю изменения и отправлю их в GitHub...",
          },
        ]);
        await onSync();
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "Готово! Все изменения успешно отправлены в ваш репозиторий. ✅",
          },
        ]);
        return;
      }

      const result = await getAiEdit(currentCode, userMsg, currentLang, "", fileName);
      if (result) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: `Готово! Применить изменения к файлу?\n\n\`\`\`\n${result.slice(0, 300)}${
              result.length > 300 ? "\n..." : ""
            }\n\`\`\``,
          },
        ]);
        onApply(result);
        toast.success("ИИ обновил код");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Не смог обработать запрос. Попробуйте иначе." },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Ошибка: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12141a] border-l border-white/8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 bg-[#1a1d27] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-white/80">{aiName}</span>
          <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">
            {aiVersion}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* GitHub push button */}
          {onSync && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/30 hover:text-blue-400 transition-colors"
              onClick={handleSync}
              disabled={isSyncing}
              title="Отправить в GitHub"
            >
              {isSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Github className="w-3 h-3" />
              )}
            </Button>
          )}
          {/* Clear chat */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white/30 hover:text-white/60"
            onClick={() =>
              setMessages([{ role: "ai", text: "Чат очищен. Чем помочь?" }])
            }
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* ── AI Provider Switcher ── */}
      <div className="flex px-2 py-1.5 gap-1 border-b border-white/8 shrink-0 bg-[#0f1120]/60">
        <button
          onClick={() => switchProvider("gemini")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-all ${
            aiProvider === "gemini"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          Gemini 2.5
        </button>
        <button
          onClick={() => switchProvider("groq")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-all ${
            aiProvider === "groq"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          Groq AI
        </button>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "ai" && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-white/6 text-white/80 rounded-bl-sm border border-white/8"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mr-2">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="bg-white/6 border border-white/8 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                <span className="text-xs text-white/50">Думаю...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <div className="px-3 py-2 border-t border-white/8 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Опишите задачу..."
            className="min-h-[60px] max-h-[120px] text-xs bg-white/5 border-white/10 text-white/80 placeholder:text-white/25 resize-none focus-visible:ring-violet-500/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={loading || !input.trim()}
            className="h-9 w-9 shrink-0 bg-violet-600 hover:bg-violet-500"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-white/20 mt-1">
          Enter — отправить · Shift+Enter — перенос
        </p>
      </div>
    </div>
  );
}
