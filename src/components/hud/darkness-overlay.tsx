"use client";

import { motion } from "framer-motion";

interface DarknessOverlayProps {
  level: number; // 0-100
  antiVision?: string;
}

export function DarknessOverlay({ level, antiVision }: DarknessOverlayProps) {
  if (level <= 0) return null;

  // Calculate opacity based on darkness level
  // At level 100, max opacity is 0.7 (so UI is still visible)
  const baseOpacity = Math.min(level / 150, 0.7);

  // Pulse effect kicks in at higher darkness levels
  const shouldPulse = level >= 30;

  // Anti-vision text shows at high darkness
  const showAntiVision = level >= 50 && antiVision;

  return (
    <>
      {/* Main darkness overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: baseOpacity,
        }}
        transition={{ duration: 0.5 }}
        className={`fixed inset-0 pointer-events-none z-20 ${
          shouldPulse ? "animate-darkness-pulse" : ""
        }`}
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(26, 10, 10, ${baseOpacity}) 100%)`,
          // CSS variables for animation
          "--darkness-base": baseOpacity.toString(),
          "--darkness-peak": Math.min(baseOpacity + 0.1, 0.8).toString(),
        } as React.CSSProperties}
      />

      {/* Red vignette at edges */}
      {level >= 20 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: level / 200 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 pointer-events-none z-20"
          style={{
            boxShadow: `inset 0 0 ${level * 2}px rgba(255, 0, 68, ${level / 300})`,
          }}
        />
      )}

      {/* Anti-Vision text bleeding through */}
      {showAntiVision && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: (level - 50) / 150 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-21 overflow-hidden"
        >
          <div className="text-center px-8 max-w-2xl">
            <motion.p
              animate={{
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="font-hud text-darkness-text/30 text-lg leading-relaxed tracking-wide"
              style={{
                textShadow: "0 0 20px rgba(255, 34, 34, 0.5)",
              }}
            >
              {antiVision}
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Warning indicator at top */}
      {level >= 40 && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 z-30 flex justify-center py-2"
        >
          <div className="bg-hud-danger/20 border border-hud-danger/50 rounded-full px-4 py-1 backdrop-blur-sm">
            <span className="font-hud text-xs text-hud-danger uppercase tracking-wider animate-glitch">
              {level >= 70 ? "CRITICAL FAILURE" : level >= 50 ? "HIGH DARKNESS" : "WARNING"}
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
}
