"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const [printing, setPrinting] = useState(false);
  const themeRef = useRef<Theme>("dark");
  themeRef.current = theme;

  useEffect(() => {
    const stored = localStorage.getItem("avgenix-theme") as Theme | null;
    const resolved = (stored === "light" || stored === "dark") ? stored : "dark";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    setMounted(true);
  }, []);

  // Printouts (Signal Flow / Room Designer "Export PDF", or Ctrl+P anywhere)
  // always use the light palette, whichever theme is on screen. beforeprint
  // fires synchronously inside window.print(), so the re-render is flushed
  // with flushSync — otherwise the page would be snapshotted still dark.
  // Components that pick colors in JS (e.g. Room Designer's canvasColors)
  // follow along because the context reports "light" while printing.
  useEffect(() => {
    const before = () => {
      document.documentElement.setAttribute("data-theme", "light");
      flushSync(() => setPrinting(true));
    };
    const after = () => {
      document.documentElement.setAttribute("data-theme", themeRef.current);
      setPrinting(false);
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("avgenix-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  // Prevent flash — set attribute via script in layout, but also ensure SSR body is correct
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme: printing ? "light" : theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
