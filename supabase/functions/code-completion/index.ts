import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { codeBefore, language } = await req.json();
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
            content: `You are an expert ${language} coding assistant. Provide short, precise code completions. Rules:
1. Return ONLY the completion code, no explanations or markdown.
2. Match the indentation and style.
3. Complete the current line or add 1-2 logical lines.
4. If no completion is obvious, return empty string.
5. For Python: include type hints when appropriate.
6. For CSS: use modern properties.`,
          },
          {
            role: "user",
            content: `Complete this ${language} code:\n${codeBefore.slice(-1500)}`,
          },
        ],
        max_tokens: 100,
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
