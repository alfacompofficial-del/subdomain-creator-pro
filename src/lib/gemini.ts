import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getCodeCompletion(codeBefore: string, language: string) {
  if (!API_KEY) return "";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an expert ${language} coding assistant.
Your task is to provide a short, single-line or small block code completion for the existing code provided below.
Rules:
1. Return ONLY the code completion text.
2. DO NOT include any explanations, markdown code blocks, or preamble.
3. Match the indentation and style of the provided code.
4. If no completion is obvious, return an empty string.

Code Context (ending exactly where you should start):
${codeBefore}
    `.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up if the model accidentally returns markdown blocks
    text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/g, "");
    
    return text;
  } catch (error) {
    console.error("Gemini AI Completion Error:", error);
    return "";
  }
}
