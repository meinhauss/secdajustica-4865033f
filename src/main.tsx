import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/fira-sans/300.css";
import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-sans/700.css";
import "./index.css";
import { installAnalistaInterceptor } from "./lib/analistaInterceptor";

installAnalistaInterceptor();


// Initialize theme as early as possible to avoid flash
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);
