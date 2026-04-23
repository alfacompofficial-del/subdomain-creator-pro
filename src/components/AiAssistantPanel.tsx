import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, X } from 'lucide-react';
import { getAiEdit } from '@/lib/gemini';
import { toast } from 'sonner';

interface AiAssistantPanelProps {
  code: string;
  language: string;
  onApply: (newCode: string) => void;
  onClose: () => void;
}

export function AiAssistantPanel({ code, language, onApply, onClose }: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const fixedCode = await getAiEdit(code, prompt, language);
      if (!mountedRef.current) return;
      
      if (fixedCode && fixedCode.trim().length > 0) {
        onApply(fixedCode);
        toast.success('Код успешно обновлен ИИ');
        setPrompt(''); // Очищаем поле для следующего запроса
        setIsProcessing(false);
      } else {
        toast.error('ИИ не смог изменить код');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('[AiAssistant] Error:', err);
      if (mountedRef.current) {
        toast.error('Ошибка обращения к ИИ');
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="absolute right-4 bottom-4 w-80 bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-xl z-50 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Sparkles className="w-4 h-4" />
          <span>ИИ Помощник</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Опишите, что нужно сделать, и ИИ попытается изменить ваш код.
        </p>
        <Textarea 
          placeholder="Например: добавь обработчик /start"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[80px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={!prompt.trim() || isProcessing}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Думаю...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Применить
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
