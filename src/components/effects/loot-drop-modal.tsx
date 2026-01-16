"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { BossReward } from "@/types/database";

interface LootDropModalProps {
  isOpen: boolean;
  bossTitle: string | null;
  reward: BossReward | null;
  onClaim: () => void;
  onDismiss: () => void;
}

export function LootDropModal({
  isOpen,
  bossTitle,
  reward,
  onClaim,
  onDismiss,
}: LootDropModalProps) {
  if (!isOpen || !reward) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="max-w-sm w-full"
        >
          {/* Victory Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <div className="text-4xl mb-2">
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="inline-block"
              >
                🏆
              </motion.span>
            </div>
            <h2 className="font-hud text-2xl text-hud-warning text-glow tracking-wider">
              BOSS DEFEATED!
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              &ldquo;{bossTitle}&rdquo;
            </p>
          </motion.div>

          {/* Loot Card */}
          <motion.div
            initial={{ opacity: 0, rotateY: 180 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="border-2 border-hud-warning/50 rounded-xl p-6 bg-gradient-to-b from-hud-warning/10 to-card text-center relative overflow-hidden"
          >
            {/* Sparkle effects */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-hud-warning rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.8 + i * 0.2,
                    repeat: Infinity,
                  }}
                  style={{
                    left: `${20 + (i * 12)}%`,
                    top: `${10 + (i % 3) * 30}%`,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring", damping: 10 }}
              className="relative z-10"
            >
              <p className="text-xs text-hud-warning uppercase tracking-wider mb-3">
                Loot Dropped!
              </p>

              {/* Reward Icon */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-6xl mb-4"
              >
                {reward.icon}
              </motion.div>

              {/* Reward Title */}
              <h3 className="font-hud text-xl text-foreground mb-2">
                {reward.title}
              </h3>

              {reward.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {reward.description}
                </p>
              )}

              {reward.estimated_cost && (
                <p className="text-xs text-hud-success">
                  Value: ${reward.estimated_cost}
                </p>
              )}
            </motion.div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-6 space-y-3"
          >
            <button
              onClick={onClaim}
              className="w-full py-4 bg-hud-warning/20 border-2 border-hud-warning text-hud-warning font-hud uppercase tracking-wider rounded-lg hover:bg-hud-warning/30 transition-colors text-lg"
            >
              Claim Reward
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Save for Later
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
