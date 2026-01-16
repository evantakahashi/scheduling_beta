"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GameOverScreenProps {
  isVisible: boolean;
  antiVision: string | undefined;
  onContinue: () => void;
}

export function GameOverScreen({
  isVisible,
  antiVision,
  onContinue,
}: GameOverScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-darkness-bg"
        >
          {/* Scan lines effect */}
          <div className="absolute inset-0 scan-lines opacity-50 pointer-events-none" />

          {/* Glitched GAME OVER text */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            className="relative"
          >
            <h1 className="font-hud text-5xl md:text-7xl text-hud-danger tracking-widest animate-glitch">
              GAME OVER
            </h1>
            {/* Glitch layers */}
            <span
              className="absolute inset-0 font-hud text-5xl md:text-7xl text-hud-primary tracking-widest opacity-50 animate-glitch-1"
              aria-hidden="true"
            >
              GAME OVER
            </span>
            <span
              className="absolute inset-0 font-hud text-5xl md:text-7xl text-hud-secondary tracking-widest opacity-50 animate-glitch-2"
              aria-hidden="true"
            >
              GAME OVER
            </span>
          </motion.div>

          {/* Anti-Vision text */}
          {antiVision && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-12 max-w-md mx-auto px-6"
            >
              <p className="text-center text-hud-danger/80 text-sm italic leading-relaxed">
                &ldquo;{antiVision}&rdquo;
              </p>
            </motion.div>
          )}

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-8 text-muted-foreground text-sm text-center px-6"
          >
            You failed a Main Quest in Hardcore mode.
            <br />
            Your streak has been reset.
          </motion.p>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.3 }}
            onClick={onContinue}
            className="mt-12 px-8 py-3 border-2 border-hud-danger text-hud-danger font-hud text-lg uppercase tracking-wider hover:bg-hud-danger/10 transition-colors animate-pulse"
          >
            Continue?
          </motion.button>

          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute top-10 left-10 text-hud-danger/30 font-mono text-xs"
          >
            ERR_MAIN_QUEST_FAILED
            <br />
            STREAK_RESET: TRUE
            <br />
            HARDCORE_MODE: ACTIVE
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute bottom-10 right-10 text-hud-danger/30 font-mono text-xs text-right"
          >
            SYSTEM_STATUS: CRITICAL
            <br />
            RECOVERY_MODE: ENABLED
            <br />
            AWAIT_USER_INPUT...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
