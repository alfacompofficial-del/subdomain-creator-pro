const COMPLETION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-completion`;

export async function getCodeCompletion(codeBefore: string, language: string) {
  if (codeBefore.length < 5) return "";

  try {
    const resp = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ codeBefore, language }),
    });

    if (!resp.ok) return "";
    const data = await resp.json();
    return data.completion || "";
  } catch (error) {
    console.error("AI Completion Error:", error);
    return "";
  }
}
