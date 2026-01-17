"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Home", icon: "🏠" },
  { path: "/today", label: "Today", icon: "⚔️" },
  { path: "/boss", label: "Boss", icon: "👹" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path ||
              (item.path === "/dashboard" && pathname === "/");

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                  isActive
                    ? "text-hud-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`text-xs ${isActive ? "font-hud" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
