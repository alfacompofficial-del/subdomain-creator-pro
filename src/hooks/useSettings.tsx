import React, { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

interface Settings {
  theme: Theme;
  accentColor: string;
  aiEnabled: boolean;
  pycharmComments: boolean;
  defaultLobbyLanguage: string;
  language: Language;
}

interface SettingsContextType extends Settings {
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setAiEnabled: (enabled: boolean) => void;
  setPycharmComments: (enabled: boolean) => void;
  setDefaultLobbyLanguage: (lang: string) => void;
  setLanguage: (lang: Language) => void;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_COLOR = "217 91% 60%"; // Original blue

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>((localStorage.getItem("app-theme") as Theme) || "dark");
  const [accentColor, setAccentColor] = useState(localStorage.getItem("app-accent") || DEFAULT_COLOR);
  const [aiEnabled, setAiEnabled] = useState(localStorage.getItem("app-ai-enabled") === "true");
  const [pycharmComments, setPycharmComments] = useState(localStorage.getItem("app-pycharm-comments") === "true");
  const [defaultLobbyLanguage, setDefaultLobbyLanguage] = useState(localStorage.getItem("app-lobby-lang") || "html");
  const [language, setLanguage] = useState<Language>((localStorage.getItem("app-language") as Language) || "ru");

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
    document.documentElement.style.setProperty("--primary", accentColor);
    // Also update ring color
    document.documentElement.style.setProperty("--ring", accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem("app-ai-enabled", String(aiEnabled));
  }, [aiEnabled]);

  useEffect(() => {
    localStorage.setItem("app-pycharm-comments", String(pycharmComments));
  }, [pycharmComments]);

  useEffect(() => {
    localStorage.setItem("app-lobby-lang", defaultLobbyLanguage);
  }, [defaultLobbyLanguage]);

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
        pycharmComments,
        defaultLobbyLanguage,
        setTheme,
        setAccentColor,
        setAiEnabled,
        setPycharmComments,
        setDefaultLobbyLanguage,
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
