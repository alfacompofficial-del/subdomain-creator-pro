import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── API Keys ────────────────────────────────────────────────────────────────
const BUILT_IN_GEMINI_KEY = "AIzaSyAomcWfzjJaNoZsbaQbRo7yRWCRb7v2noA";
const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiKey(): string {
  return localStorage.getItem("app-gemini-key") || BUILT_IN_GEMINI_KEY;
}

function getProvider(): "gemini" | "groq" {
  const stored = localStorage.getItem("app-ai-provider");
  return stored === "groq" ? "groq" : "gemini"; // Default to gemini
}

function getGroqKey(): string {
  return localStorage.getItem("app-groq-key") || (import.meta.env.VITE_GROQ_API_KEY as string) || "";
}

async function geminiGenerate(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function groqGenerate(prompt: string, systemPrompt?: string, jsonMode = false): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error("Groq key not set");
  const messages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
    : [{ role: "user", content: prompt }];
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: systemPrompt ? "llama3-70b-8192" : "llama3-8b-8192",
      messages,
      temperature: 0.15,
      max_tokens: 4096,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!resp.ok) throw new Error(`Groq error: ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function cleanCode(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/g, "").trim();
}

// ─── In-memory completion cache ───────────────────────────────────────────────
const completionCache = new Map<string, { text: string; time: number }>();
const CACHE_TTL = 30_000;

// ─── Exported functions ───────────────────────────────────────────────────────

export async function getCodeCompletion(
  codeBefore: string,
  language: string,
  codeAfter: string = "",
  externalSignal?: AbortSignal
): Promise<string> {
  if (codeBefore.length < 3) return "";

  const cacheKey = language + ":" + codeBefore.slice(-200);
  const cached = completionCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.text;

  const controller = new AbortController();
  if (externalSignal) externalSignal.addEventListener("abort", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const prompt = `You are an expert AI coding assistant. Complete the following ${language} code.
Code before cursor:
${codeBefore.slice(-3000)}

Code after cursor:
${codeAfter.slice(0, 1000)}

Output ONLY the code to insert at the cursor. No markdown, no explanations.`;

    let text = "";
    if (getProvider() === "groq") {
      text = await groqGenerate(prompt);
    } else {
      text = await geminiGenerate(prompt);
    }

    clearTimeout(timeout);
    text = cleanCode(text);

    if (text) {
      completionCache.set(cacheKey, { text, time: Date.now() });
      if (completionCache.size > 100) {
        const oldest = completionCache.keys().next().value;
        if (oldest) completionCache.delete(oldest);
      }
    }
    return text;
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

export async function getCodeFix(code: string, errorText: string, language: string): Promise<string> {
  try {
    const prompt = `Fix the following ${language} code based on this error/request: ${errorText}

Code:
${code}

Output ONLY the fixed code. No markdown, no explanations.`;

    const text = getProvider() === "groq"
      ? await groqGenerate(prompt)
      : await geminiGenerate(prompt);

    return cleanCode(text);
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
    const systemPrompt = `You are an expert Senior Full-Stack Developer AI.
${fileName ? `File: ${fileName}` : ""}

RULES:
1. Return ONLY the complete modified code — no markdown, no explanations.
2. Do NOT truncate. Return the ENTIRE file.
3. Understand Russian instructions. Output must be ONLY raw code.

USER INSTRUCTION: ${command}
${selection ? `\nFocus on this selected snippet:\n${selection}` : ""}`;

    const userPrompt = `Code:\n${selection || code}`;

    let text = "";
    if (getProvider() === "groq") {
      text = await groqGenerate(userPrompt, systemPrompt);
    } else {
      text = await geminiGenerate(`${systemPrompt}\n\n${userPrompt}`);
    }

    return cleanCode(text);
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
  _language: string
): Promise<CodeUpdate | null> {
  try {
    const prompt = `You are a Senior Full-Stack Developer AI.
Task: ${command}

Current Project Files:
${files.html ? `--- HTML ---\n${files.html}\n` : ""}
${files.css ? `--- CSS ---\n${files.css}\n` : ""}
${files.js ? `--- JS ---\n${files.js}\n` : ""}
${files.python ? `--- PYTHON ---\n${files.python}\n` : ""}

Return a valid JSON object ONLY with: "html", "css", "js", "python", "explanation". No markdown, no backticks.`;

    let text = "";
    if (getProvider() === "groq") {
      text = await groqGenerate(prompt, undefined, true);
    } else {
      const genAI = new GoogleGenerativeAI(getGeminiKey());
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      text = result.response.text();
    }

    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
