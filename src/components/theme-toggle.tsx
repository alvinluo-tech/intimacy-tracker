"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 必须等待挂载后渲染，避免水合错误
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[160px] bg-surface/2 animate-pulse rounded-md" />; // 骨架屏占位
  }

  return (
    <div className="flex gap-2 p-1 bg-surface/2 rounded-lg">
      <button 
        onClick={() => setTheme("light")} 
        className={`px-3 py-1 rounded-md text-sm ${theme === "light" ? "bg-surface shadow-sm font-medium" : "text-muted"}`}
      >
        Light
      </button>
      <button 
        onClick={() => setTheme("dark")} 
        className={`px-3 py-1 rounded-md text-sm ${theme === "dark" ? "bg-surface shadow-sm font-medium" : "text-muted"}`}
      >
        Dark
      </button>
      <button 
        onClick={() => setTheme("system")} 
        className={`px-3 py-1 rounded-md text-sm ${theme === "system" ? "bg-surface shadow-sm font-medium" : "text-muted"}`}
      >
        System
      </button>
    </div>
  );
}
