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
  selection: string = ""
): Promise<string> {
  try {
    const prompt = `You are an expert ${language} coding assistant. Modify the provided code according to the user's instructions.
Rules:
1. Return ONLY the complete modified code. No explanations, no markdown formatting.
2. Keep the original style and indentation.
3. Add the requested features.

Task to implement: ${command}
${selection ? `Specifically focus on this selected snippet:\n${selection}` : ""}

IMPORTANT: You MUST write the complete modified code. Do NOT return the original code unmodified. Do NOT explain anything. ONLY return the code.`;

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
    text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/g, "").replace(/```/g, "").trim();
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
