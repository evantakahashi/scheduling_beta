"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XpPopupProps {
  amount: number;
  onComplete?: () => void;
}

export function XpPopup({ amount, onComplete }: XpPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (amount <= 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -40, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-2 right-0 pointer-events-none z-50"
        >
          <span className="font-hud text-lg text-hud-success font-bold tracking-wider text-glow">
            +{amount} XP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Container component that tracks XP changes and shows popups
interface XpPopupContainerProps {
  currentXp: number;
  children?: React.ReactNode;
}

export function XpPopupContainer({ currentXp, children }: XpPopupContainerProps) {
  const [popups, setPopups] = useState<{ id: number; amount: number }[]>([]);
  const [prevXp, setPrevXp] = useState(currentXp);

  useEffect(() => {
    if (currentXp > prevXp) {
      const gained = currentXp - prevXp;
      const id = Date.now();
      setPopups((prev) => [...prev, { id, amount: gained }]);
    }
    setPrevXp(currentXp);
  }, [currentXp, prevXp]);

  const removePopup = (id: number) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="relative">
      {children}
      {popups.map((popup) => (
        <XpPopup
          key={popup.id}
          amount={popup.amount}
          onComplete={() => removePopup(popup.id)}
        />
      ))}
    </div>
  );
}
