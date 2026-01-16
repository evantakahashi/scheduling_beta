"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BossDamagePopupProps {
  damage: number;
  onComplete?: () => void;
}

export function BossDamagePopup({ damage, onComplete }: BossDamagePopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (damage <= 0) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [damage, onComplete]);

  if (damage <= 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 0.8 }}
          animate={{ opacity: 0, y: -30, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
        >
          <span className="font-hud text-xl text-hud-danger font-bold tracking-wider drop-shadow-lg">
            -{damage} HP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Container for Boss HP bar that tracks damage
interface BossDamageContainerProps {
  recentDamage: number;
  children: React.ReactNode;
}

export function BossDamageContainer({ recentDamage, children }: BossDamageContainerProps) {
  const [popups, setPopups] = useState<{ id: number; damage: number }[]>([]);
  const [prevDamage, setPrevDamage] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (recentDamage > 0 && recentDamage !== prevDamage) {
      const id = Date.now();
      setPopups((prev) => [...prev, { id, damage: recentDamage }]);
      setIsFlashing(true);

      // Clear flash after animation
      const flashTimer = setTimeout(() => setIsFlashing(false), 300);

      setPrevDamage(recentDamage);
      return () => clearTimeout(flashTimer);
    }
  }, [recentDamage, prevDamage]);

  const removePopup = (id: number) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className={`relative ${isFlashing ? "animate-damage-flash" : ""}`}>
      {children}
      {popups.map((popup) => (
        <BossDamagePopup
          key={popup.id}
          damage={popup.damage}
          onComplete={() => removePopup(popup.id)}
        />
      ))}
    </div>
  );
}
