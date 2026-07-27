"use client";

import { SunMoon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 rounded-2xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
      aria-label="Alternar tema"
      title="Alternar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <SunMoon />
    </Button>
  );
}
