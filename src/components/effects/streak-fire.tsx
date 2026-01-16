"use client";

import { motion } from "framer-motion";

interface StreakFireProps {
  streak: number;
}

export function StreakFire({ streak }: StreakFireProps) {
  if (streak <= 0) return null;

  // Intensity scales with streak
  const intensity = Math.min(streak / 7, 1); // Max intensity at 7-day streak

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Fire emoji with animation */}
      <motion.span
        animate={{
          scale: [1, 1.1, 1],
          rotate: [-3, 3, -3],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-lg"
        style={{
          filter: `brightness(${1 + intensity * 0.3})`,
        }}
      >
        &#x1F525;
      </motion.span>

      {/* Streak number with fire glow */}
      <span
        className={`font-hud text-lg ${streak >= 7 ? "animate-fire-flicker" : ""}`}
        style={{
          color: streak >= 7 ? "#ff6600" : streak >= 3 ? "#ffaa00" : "#ffcc00",
          textShadow:
            streak >= 7
              ? "0 0 8px #ff6600, 0 0 16px #ff3300"
              : streak >= 3
              ? "0 0 4px #ffaa00"
              : "none",
        }}
      >
        {streak}
      </span>

      {/* Extra fire particles for high streaks */}
      {streak >= 5 && (
        <motion.span
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
          className="absolute -right-1 -top-1 text-xs"
        >
          &#x2728;
        </motion.span>
      )}
    </div>
  );
}

// Standalone streak display with fire effect
interface StreakDisplayProps {
  streak: number;
  label?: boolean;
}

export function StreakDisplay({ streak, label = true }: StreakDisplayProps) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1">
        {streak > 0 ? (
          <StreakFire streak={streak} />
        ) : (
          <span className="font-hud text-lg text-muted-foreground">0</span>
        )}
      </div>
      {label && (
        <div className="text-xs text-muted-foreground uppercase">Streak</div>
      )}
    </div>
  );
}
