import React, { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

interface Settings {
  theme: Theme;
  accentColor: string;
  aiEnabled: boolean;
  aiProvider: "gemini" | "groq";
  groqApiKey: string;
  pycharmComments: boolean;
  defaultLobbyLanguage: string;
  language: Language;
  githubToken: string;
  githubAutoPush: boolean;
}

interface SettingsContextType extends Settings {
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setAiEnabled: (enabled: boolean) => void;
  setAiProvider: (provider: "gemini" | "groq") => void;
  setGroqApiKey: (key: string) => void;
  setPycharmComments: (enabled: boolean) => void;
  setDefaultLobbyLanguage: (lang: string) => void;
  setLanguage: (lang: Language) => void;
  setGithubToken: (token: string) => void;
  setGithubAutoPush: (enabled: boolean) => void;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_COLOR = "217 91% 60%"; // Original blue

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>((localStorage.getItem("app-theme") as Theme) || "dark");
  const [accentColor, setAccentColor] = useState(localStorage.getItem("app-accent") || DEFAULT_COLOR);
  const [aiEnabled, setAiEnabled] = useState(localStorage.getItem("app-ai-enabled") === "true");
  const [aiProvider, setAiProvider] = useState<"gemini" | "groq">((localStorage.getItem("app-ai-provider") as "gemini" | "groq") || "gemini");
  const [groqApiKey, setGroqApiKey] = useState(
    localStorage.getItem("app-groq-key") || (import.meta as any).env?.VITE_GROQ_API_KEY || ""
  );
  const [pycharmComments, setPycharmComments] = useState(localStorage.getItem("app-pycharm-comments") === "true");
  const [defaultLobbyLanguage, setDefaultLobbyLanguage] = useState(localStorage.getItem("app-lobby-lang") || "html");
  const [language, setLanguage] = useState<Language>((localStorage.getItem("app-language") as Language) || "ru");
  const [githubToken, setGithubToken] = useState(localStorage.getItem("app-github-token") || "");
  const [githubAutoPush, setGithubAutoPush] = useState(localStorage.getItem("app-github-autopush") === "true");

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("app-accent", accentColor);
    const root = document.documentElement;
    root.style.setProperty("--primary", accentColor);
    root.style.setProperty("--ring", accentColor);
    root.style.setProperty("--sidebar-primary", accentColor);
    root.style.setProperty("--sidebar-ring", accentColor);
    // Compute a slightly adjusted accent (shift hue by 30deg for accent)
    const parts = accentColor.match(/(\d+\.?\d*)/g);
    if (parts && parts.length >= 3) {
      const h = (parseFloat(parts[0]) + 30) % 360;
      const s = parts[1];
      const l = parts[2];
      root.style.setProperty("--accent", `${h} ${s}% ${l}%`);
    }
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem("app-ai-enabled", String(aiEnabled));
  }, [aiEnabled]);

  useEffect(() => {
    localStorage.setItem("app-ai-provider", aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem("app-groq-key", groqApiKey);
  }, [groqApiKey]);

  useEffect(() => {
    localStorage.setItem("app-pycharm-comments", String(pycharmComments));
  }, [pycharmComments]);

  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("app-github-token", githubToken);
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem("app-github-autopush", String(githubAutoPush));
  }, [githubAutoPush]);

  const updateProfile = async (data: { name?: string; bio?: string }) => {
     // Profile update logic will be implementation in the component or via supabase here
     // For now, this is a placeholder to show intent
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        accentColor,
        aiEnabled,
        aiProvider,
        groqApiKey,
        pycharmComments,
        defaultLobbyLanguage,
        language,
        githubToken,
        githubAutoPush,
        setTheme,
        setAccentColor,
        setAiEnabled,
        setAiProvider,
        setGroqApiKey,
        setPycharmComments,
        setDefaultLobbyLanguage,
        setLanguage,
        setGithubToken,
        setGithubAutoPush,
        updateProfile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
