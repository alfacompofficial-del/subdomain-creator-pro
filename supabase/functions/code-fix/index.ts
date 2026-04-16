import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, errorText, language } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ fixedCode: "" }), {
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
            content: `You are an expert ${language} code fixer. Fix the error in the code. Rules:
1. Return ONLY the fixed code, no explanations or markdown.
2. Keep the original style and indentation.
3. Fix only the error, don't change other code.
4. If you can't fix it, return the original code.`,
          },
          {
            role: "user",
            content: `Fix this ${language} code:\n\`\`\`\n${code}\n\`\`\`\n\nError: ${errorText}`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ fixedCode: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/g, "");

    return new Response(JSON.stringify({ fixedCode: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("code-fix error:", e);
    return new Response(JSON.stringify({ fixedCode: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
