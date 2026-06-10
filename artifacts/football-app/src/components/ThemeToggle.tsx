import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <span className="relative w-8 h-4 rounded-full bg-secondary border border-border flex items-center flex-shrink-0 transition-colors duration-300">
        <span
          className={`absolute w-3 h-3 rounded-full bg-primary transition-transform duration-300 ${
            isDark ? "translate-x-0.5" : "translate-x-4"
          }`}
        />
      </span>
      <span className="flex items-center gap-1.5">
        {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        {isDark ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
}
