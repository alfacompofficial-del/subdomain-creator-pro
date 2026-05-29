import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { codeBefore, codeAfter, language } = await req.json();
    if (!codeBefore || codeBefore.length < 5) {
      return new Response(JSON.stringify({ completion: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an expert ${language} coding assistant (like GitHub Copilot).
Your task is to provide a "ghost text" completion. You are given the code BEFORE the cursor and the code AFTER the cursor.
Return ONLY the text that should be inserted AT the cursor position to logically connect the prefix and suffix.

Rules:
1. Return ONLY raw text. NO markdown, NO comments, NO explanations.
2. Match indentation, naming style, and logic perfectly.
3. For Python:
   - If writing a method inside a class (e.g. after 'def '), ALWAYS include 'self' as the first argument unless it's a @staticmethod.
   - Intelligently predict class methods, __init__, and imports.
4. If the code before is incomplete (e.g. 'def func('), complete it accurately.
5. If nothing needs to be inserted or the context is unclear, return an empty string.`,
          },
          {
            role: "user",
            content: `--- CODE BEFORE (PREFIX) ---
${codeBefore.slice(-1000)}

--- CODE AFTER (SUFFIX) ---
${codeAfter?.slice(0, 500) || ""}

Generate the completion for the cursor position between PREFIX and SUFFIX:`,
          },
        ],
        max_tokens: 120,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ completion: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", response.status, await response.text());
      return new Response(JSON.stringify({ completion: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/g, "");

    return new Response(JSON.stringify({ completion: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("code-completion error:", e);
    return new Response(JSON.stringify({ completion: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
