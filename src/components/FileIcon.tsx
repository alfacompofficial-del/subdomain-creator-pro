import React from "react";

interface FileIconProps {
  name: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  size?: number;
}

export function FileIcon({ name, isDirectory = false, isOpen = false, size = 16 }: FileIconProps) {
  if (isDirectory) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {isOpen ? (
          <>
            <path d="M1.5 3.5C1.5 2.948 1.948 2.5 2.5 2.5H6.086C6.351 2.5 6.604 2.605 6.793 2.793L7.707 3.707C7.895 3.895 8.149 4 8.414 4H13.5C14.052 4 14.5 4.448 14.5 5V5.5H1.5V3.5Z" fill="#7a8499"/>
            <path d="M1.5 5.5H14.5L13.4 12.1C13.3 12.626 12.841 13 12.308 13H3.692C3.159 13 2.7 12.626 2.6 12.1L1.5 5.5Z" fill="#90a0b7"/>
            <path d="M1.5 5.5H14.5L13.4 12.1C13.3 12.626 12.841 13 12.308 13H3.692C3.159 13 2.7 12.626 2.6 12.1L1.5 5.5Z" fill="url(#folderOpen)" fillOpacity="0.3"/>
            <defs>
              <linearGradient id="folderOpen" x1="8" y1="5.5" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                <stop stopColor="#74c0fc"/>
                <stop offset="1" stopColor="#4dabf7"/>
              </linearGradient>
            </defs>
          </>
        ) : (
          <>
            <path d="M2 4C2 3.448 2.448 3 3 3H6.586C6.851 3 7.104 3.105 7.293 3.293L8.207 4.207C8.395 4.395 8.649 4.5 8.914 4.5H13C13.552 4.5 14 4.948 14 5.5V12C14 12.552 13.552 13 13 13H3C2.448 13 2 12.552 2 12V4Z" fill="#5c6680"/>
            <path d="M2 6H14V12C14 12.552 13.552 13 13 13H3C2.448 13 2 12.552 2 12V6Z" fill="#6b7a9a"/>
          </>
        )}
      </svg>
    );
  }

  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";

  switch (ext) {
    case "py":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.99 2C6.008 2 5 2.895 5 4.26v1.24h3v.5H3.5C2.12 6 1 7.124 1 8.5s1.12 2.5 2.5 2.5H4V12c0 1.365 1.008 2 3 2s3-.635 3-2v-1.5h.5c1.38 0 2.5-1.124 2.5-2.5S11.88 6 10.5 6H10V4.26C10 2.895 9.2 2 7.99 2z" fill="url(#pyGrad)"/>
          <circle cx="5.5" cy="4.5" r="0.75" fill="#fff" opacity="0.9"/>
          <circle cx="10.5" cy="11.5" r="0.75" fill="#fff" opacity="0.9"/>
          <defs>
            <linearGradient id="pyGrad" x1="1" y1="2" x2="15" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4584b6"/>
              <stop offset="1" stopColor="#ffde57"/>
            </linearGradient>
          </defs>
        </svg>
      );

    case "html":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2L3.2 13.2L8 15L12.8 13.2L14 2H2Z" fill="#e44d26"/>
          <path d="M8 13.8V3.4H12.6L11.65 12.25L8 13.8Z" fill="#f16529"/>
          <path d="M5.05 5.6H8V7.4H6.85L6.95 8.6H8V10.4H5.3L5.05 7.8V7.4V5.6ZM8 5.6H10.95V7.4H8V5.6ZM8 8.6H10.65L10.45 10.75L8 11.4V9.6L9.35 9.25L9.45 8.6H8V8.6Z" fill="white"/>
        </svg>
      );

    case "css":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2L3.2 13.2L8 15L12.8 13.2L14 2H2Z" fill="#2965f1"/>
          <path d="M8 13.8V3.4H12.6L11.65 12.25L8 13.8Z" fill="#264de4"/>
          <path d="M5.5 5.6H10.5V7.4H7.45L7.55 8.6H10.5V10.4H5.8L5.5 7.8V5.6ZM5.8 10.4H7.6V11.8L8 11.95L8.4 11.8V10.4H10.2L9.85 12.7L8 13.2L6.15 12.7L5.8 10.4Z" fill="white"/>
        </svg>
      );

    case "js":
    case "jsx":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill="#f7df1e"/>
          <path d="M10.5 11.3C10.75 11.75 11.1 12.05 11.65 12.05C12.1 12.05 12.4 11.8 12.4 11.45C12.4 11.05 12.1 10.9 11.6 10.7L11.3 10.6C10.5 10.25 9.95 9.8 9.95 8.95C9.95 8.15 10.6 7.55 11.6 7.55C12.3 7.55 12.8 7.8 13.1 8.35L12.2 8.95C12.05 8.65 11.85 8.5 11.6 8.5C11.35 8.5 11.2 8.65 11.2 8.95C11.2 9.3 11.4 9.45 11.85 9.65L12.15 9.75C13.1 10.15 13.65 10.6 13.65 11.5C13.65 12.45 12.9 13 11.65 13C10.55 13 9.85 12.55 9.5 11.85L10.5 11.3ZM6.65 11.4C6.85 11.75 7.05 12.05 7.5 12.05C7.9 12.05 8.2 11.85 8.2 11.35V7.6H9.5V11.4C9.5 12.6 8.75 13.05 7.55 13.05C6.45 13.05 5.85 12.5 5.55 11.85L6.65 11.4Z" fill="#323330"/>
        </svg>
      );

    case "ts":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill="#007acc"/>
          <path d="M10.75 8.5H9V13H7.5V8.5H5.75V7H10.75V8.5ZM11 10.5C11 9.12 11.95 8.3 13.25 8.3C13.95 8.3 14.45 8.5 14.75 8.85L14 9.5C13.8 9.3 13.55 9.2 13.25 9.2C12.55 9.2 12.2 9.65 12.2 10.5C12.2 11.35 12.55 11.8 13.3 11.8C13.6 11.8 13.85 11.7 14.05 11.5L14.8 12.2C14.45 12.6 13.95 12.8 13.25 12.8C11.95 12.8 11 12 11 10.5Z" fill="white"/>
        </svg>
      );

    case "tsx":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill="#007acc"/>
          <path d="M2 9.5L5 6.5L8 9.5L11 6.5L14 9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.5 6H12V7.5H8.5V6ZM5.5 11V6H7V11H5.5Z" fill="white" opacity="0.9"/>
        </svg>
      );

    case "json":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 2.5C3.5 2.5 3 3 3 4V5C3 5.8 2.5 6.5 2 7C2.5 7.5 3 8.2 3 9V10C3 11 3.5 11.5 4.5 11.5" stroke="#ffd43b" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M11.5 2.5C12.5 2.5 13 3 13 4V5C13 5.8 13.5 6.5 14 7C13.5 7.5 13 8.2 13 9V10C13 11 12.5 11.5 11.5 11.5" stroke="#ffd43b" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="6" cy="7" r="0.75" fill="#ffd43b"/>
          <circle cx="8" cy="7" r="0.75" fill="#ffd43b"/>
          <circle cx="10" cy="7" r="0.75" fill="#ffd43b"/>
        </svg>
      );

    case "md":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="14" height="12" rx="1.5" fill="#6a737d" opacity="0.3"/>
          <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="#6a737d" strokeWidth="1"/>
          <path d="M3 11V5H5L7 8L9 5H11V11H9.5V7.5L7.5 10.5H6.5L4.5 7.5V11H3Z" fill="#6a737d"/>
          <path d="M12 11L10 8.5H11.25V5H12.75V8.5H14L12 11Z" fill="#6a737d"/>
        </svg>
      );

    case "env":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="14" height="12" rx="1.5" fill="#23d18b" opacity="0.2"/>
          <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="#23d18b" strokeWidth="1"/>
          <text x="3" y="10" fontSize="6" fill="#23d18b" fontFamily="monospace" fontWeight="bold">.ENV</text>
        </svg>
      );

    case "gitignore":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" fill="#f05032" opacity="0.2"/>
          <circle cx="8" cy="8" r="6" stroke="#f05032" strokeWidth="1"/>
          <path d="M8 5.5C8.83 5.5 9.5 6.17 9.5 7C9.5 7.55 9.2 8 8.75 8.25L10 10H9L7.75 8.5H7V10H6V7C6 6.17 6.67 5.5 7.5 5.5H8ZM7.5 6.5C7.22 6.5 7 6.72 7 7V7.5H8C8.28 7.5 8.5 7.28 8.5 7C8.5 6.72 8.28 6.5 8 6.5H7.5Z" fill="#f05032"/>
        </svg>
      );

    case "yaml":
    case "yml":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="14" height="12" rx="1.5" fill="#cb171e" opacity="0.2"/>
          <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="#cb171e" strokeWidth="1"/>
          <path d="M3 5H5L6.5 7.5L8 5H10L7.5 9V11H5.5V9L3 5Z" fill="#cb171e"/>
        </svg>
      );

    case "java":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 10.5C6.5 10.5 5.8 10.9 7 11.05C8.5 11.25 9.25 11.2 10.9 10.9C10.9 10.9 11.35 11.15 11.9 11.35C9.8 12.2 7.05 11.95 6.5 10.5ZM6.1 9.1C6.1 9.1 5.3 9.6 6.5 9.7C8.1 9.85 9.3 9.8 11.3 9.35C11.3 9.35 11.6 9.65 12 9.8C9.35 10.5 6.4 10.25 6.1 9.1Z" fill="#e76f00"/>
          <path d="M9 2.5C9 2.5 10.15 3.6 8 4.95C6.3 6.05 7.3 6.65 8 7.2C6.35 5.65 5.35 4.35 6.5 3.2C7.7 2 9 2.5 9 2.5Z" fill="#e76f00"/>
          <path d="M5.5 12.15C5.5 12.15 5.85 12.4 6.15 12.45C5.35 12.9 3.6 12.55 3.85 12.1C4.1 11.55 5.5 12.15 5.5 12.15ZM12.35 11.4C12.35 11.4 13.75 11.85 13.45 12.25C13.25 12.5 11.95 12.35 11.35 12.2L12.35 11.4Z" fill="#5382a1"/>
          <path d="M6.95 6.5C6.95 6.5 5.25 6.9 5.95 7.4C6.25 7.6 7.1 7.7 7.1 7.7C7.1 7.7 6.25 7.85 5.65 8.25C5.05 8.65 5.55 9.15 6.2 9.05C7.4 8.85 8.35 8.5 8.35 8.5L8.85 8.95C8.85 8.95 6.2 9.9 5.15 9.85C4.05 9.8 3.65 9.2 4.25 8.65C5 7.95 6.95 6.5 6.95 6.5Z" fill="#5382a1"/>
        </svg>
      );

    case "txt":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2H10L13 5V14H3V2Z" fill="#90a0b7" opacity="0.3"/>
          <path d="M3 2H10L13 5V14H3V2Z" stroke="#90a0b7" strokeWidth="1" strokeLinejoin="round"/>
          <path d="M10 2V5H13" stroke="#90a0b7" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="5" y1="7.5" x2="11" y2="7.5" stroke="#90a0b7" strokeWidth="1" strokeLinecap="round"/>
          <line x1="5" y1="9.5" x2="11" y2="9.5" stroke="#90a0b7" strokeWidth="1" strokeLinecap="round"/>
          <line x1="5" y1="11.5" x2="9" y2="11.5" stroke="#90a0b7" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2H10L13 5V14H3V2Z" fill="#78829a" opacity="0.3"/>
          <path d="M3 2H10L13 5V14H3V2Z" stroke="#78829a" strokeWidth="1" strokeLinejoin="round"/>
          <path d="M10 2V5H13" stroke="#78829a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}

export function getLanguageFromExt(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "";
  const map: Record<string, string> = {
    py: "python",
    html: "html",
    css: "css",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    java: "java",
    env: "plaintext",
    gitignore: "plaintext",
    txt: "plaintext",
    sh: "shell",
    xml: "xml",
    sql: "sql",
    rs: "rust",
    go: "go",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
  };
  return map[ext || ""] || "plaintext";
}
