const COMPLETION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-completion`;
const FIX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-fix`;

// Simple in-memory cache for completions
const completionCache = new Map<string, { text: string; time: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(code: string, language: string): string {
  // Use last 200 chars as cache key for speed
  return language + ':' + code.slice(-200);
}

export async function getCodeCompletion(codeBefore: string, language: string, codeAfter: string = "", externalSignal?: AbortSignal): Promise<string> {
  if (codeBefore.length < 3) return "";

  const key = getCacheKey(codeBefore + (codeAfter ? ":" + codeAfter.slice(0, 50) : ""), language);
  const cached = completionCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.text;
  }

  const controller = new AbortController();
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort());
  }
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s hard timeout for smarter gen

  try {
    const resp = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        codeBefore: codeBefore.slice(-1000), 
        codeAfter: codeAfter.slice(0, 500),
        language 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) return "";
    const data = await resp.json();
    const completion = data.completion || "";

    if (completion) {
      completionCache.set(key, { text: completion, time: Date.now() });
      // Evict old entries
      if (completionCache.size > 100) {
        const oldest = completionCache.keys().next().value;
        if (oldest) completionCache.delete(oldest);
      }
    }

    return completion;
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

export async function getCodeFix(code: string, errorText: string, language: string): Promise<string> {
  try {
    const resp = await fetch(FIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ code, errorText, language }),
    });

    if (!resp.ok) return "";
    const data = await resp.json();
    return data.fixedCode || "";
  } catch {
    return "";
  }
}

export async function getAiEdit(
  code: string,
  command: string,
  language: string,
  selection: string = "",
  fileName: string = ""
): Promise<string> {
  try {
    const prompt = `You are an expert Senior Full-Stack Developer AI. Your task is to modify the provided ${language} code according to the user's instructions.
${fileName ? `The file you are currently editing is named: ${fileName}` : ""}

CRITICAL RULES:
1. Return ONLY the complete modified code. NO explanations, NO greetings, NO markdown formatting like \`\`\`javascript. Just the raw text of the code.
2. Do NOT truncate the code. Return the ENTIRE file with your modifications applied.
3. Pay deep attention to logic, best practices, and clean code architecture.
4. Understand Russian instructions perfectly, but your output must be ONLY the raw code.

USER INSTRUCTION:
${command}

${selection ? `Specifically focus on this selected snippet:\n${selection}` : ""}

IMPORTANT: Write ONLY valid, complete code. Do not output anything else. Do not explain your changes.`;

    const resp = await fetch(FIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        code: selection || code, 
        errorText: prompt, 
        language 
      }),
    });

    if (!resp.ok) return "";
    const data = await resp.json();
    let text = data.fixedCode || "";
    
    // Attempt to extract code block if Gemini ignores instructions and adds text
    const blockMatch = text.match(/```[a-z]*\n([\s\S]*?)```/i);
    if (blockMatch) {
      text = blockMatch[1].trim();
    } else {
      text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/g, "").replace(/```/g, "").trim();
    }
    
    return text;
  } catch {
    return "";
  }
}

export type CodeUpdate = {
  html?: string;
  css?: string;
  js?: string;
  python?: string;
  explanation?: string;
};

export async function getOrchestratorResponse(
  files: { html?: string; css?: string; js?: string; python?: string },
  command: string,
  language: string
): Promise<CodeUpdate | null> {
  try {
    const prompt = `You are a Senior Full-Stack Developer AI. 
Task: ${command}

Current Project Files:
${files.html ? `--- HTML ---\n${files.html}\n` : ""}
${files.css ? `--- CSS ---\n${files.css}\n` : ""}
${files.js ? `--- JS ---\n${files.js}\n` : ""}
${files.python ? `--- PYTHON ---\n${files.python}\n` : ""}

Instructions:
1. Analyze the request and update ONE or MORE files as needed.
2. Return a valid JSON object with the properties: "html", "css", "js", "python", and a short "explanation".
3. ONLY return the JSON object. No markdown, no backticks, no other text.

Format:
{
  "html": "...",
  "css": "...",
  "js": "...",
  "python": "...",
  "explanation": "..."
}`;

    const resp = await fetch(FIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        code: JSON.stringify(files), 
        errorText: prompt, 
        language 
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    
    // Attempt to parse JSON from the AI response
    try {
      const cleaned = data.fixedCode.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", e);
      return { explanation: "AI вернул некорректный формат. Попробуйте еще раз." };
    }
  } catch {
    return null;
  }
}
