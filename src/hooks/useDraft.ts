import { useEffect, useState } from "react";

/**
 * Persiste um valor no localStorage automaticamente.
 * Usa debounce para não escrever a cada tecla.
 */
export function useDraft(key: string | null, initial = "") {
  const [value, setValue] = useState<string>(() => {
    if (!key || typeof window === "undefined") return initial;
    try {
      return window.localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        if (value && value !== "<p></p>") {
          window.localStorage.setItem(key, value);
          setSavedAt(new Date());
        } else {
          window.localStorage.removeItem(key);
        }
      } catch {
        /* quota exceeded, ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [key, value]);

  const clear = () => {
    if (!key || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue("");
    setSavedAt(null);
  };

  return { value, setValue, clear, savedAt };
}
