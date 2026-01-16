"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SacrificeNotificationProps {
  questTitle: string;
  onComplete?: () => void;
}

export function SacrificeNotification({ questTitle, onComplete }: SacrificeNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-24 right-4 z-50 max-w-sm"
    >
      <div className="bg-darkness-bg/90 border border-hud-danger/50 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            <motion.span
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              &#x2620;
            </motion.span>
          </div>
          <div>
            <div className="font-hud text-xs text-hud-danger uppercase tracking-wider mb-1">
              Quest Sacrificed
            </div>
            <div className="text-sm text-foreground/70 line-through">
              {questTitle}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Container that listens for sacrifice events
interface SacrificeAnimationContainerProps {
  sacrificedQuests: Array<{ id: string; title: string }>;
  onAnimationComplete?: () => void;
}

export function SacrificeAnimationContainer({
  sacrificedQuests,
  onAnimationComplete,
}: SacrificeAnimationContainerProps) {
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string }>>([]);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Find new sacrifices that haven't been shown yet
    const newSacrifices = sacrificedQuests.filter((q) => !shownIds.has(q.id));

    if (newSacrifices.length > 0) {
      setNotifications((prev) => [...prev, ...newSacrifices]);
      setShownIds((prev) => {
        const next = new Set(prev);
        newSacrifices.forEach((q) => next.add(q.id));
        return next;
      });
    }
  }, [sacrificedQuests, shownIds]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    onAnimationComplete?.();
  };

  return (
    <AnimatePresence>
      {notifications.slice(0, 3).map((notification, index) => (
        <motion.div
          key={notification.id}
          style={{ bottom: `${96 + index * 80}px` }}
          className="fixed right-4 z-50"
        >
          <SacrificeNotification
            questTitle={notification.title}
            onComplete={() => removeNotification(notification.id)}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
