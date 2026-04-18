const COMPLETION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-completion`;
const FIX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-fix`;

// Simple in-memory cache for completions
const completionCache = new Map<string, { text: string; time: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(code: string, language: string): string {
  // Use last 200 chars as cache key for speed
  return language + ':' + code.slice(-200);
}

export async function getCodeCompletion(codeBefore: string, language: string): Promise<string> {
  if (codeBefore.length < 3) return "";

  const key = getCacheKey(codeBefore, language);
  const cached = completionCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.text;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s hard timeout

  try {
    const resp = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ codeBefore: codeBefore.slice(-800), language }),
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
