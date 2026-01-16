"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { ATTRIBUTES } from "@/lib/attributes";
import type { AttributeId } from "@/types/database";

interface AddQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DURATION_PRESETS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
];

export function AddQuestModal({ isOpen, onClose }: AddQuestModalProps) {
  const { addQuest, currentDay, quests } = useGameStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questType, setQuestType] = useState<"main" | "side">("side");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAttribute = (attrId: AttributeId) => {
    setSelectedAttributes((prev) => {
      if (prev.includes(attrId)) {
        return prev.filter((id) => id !== attrId);
      }
      if (prev.length >= 2) {
        // Replace oldest selection
        return [prev[1], attrId];
      }
      return [...prev, attrId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentDay) return;

    setIsSubmitting(true);

    // Calculate planned start time
    // If there are existing quests, start after the last one
    // Otherwise, start now
    const now = new Date();
    let plannedStart: Date;

    const pendingQuests = quests.filter(
      (q) => q.status === "pending" || q.status === "active"
    );

    if (pendingQuests.length > 0) {
      const lastQuest = pendingQuests[pendingQuests.length - 1];
      plannedStart = new Date(lastQuest.plannedEnd);
    } else {
      plannedStart = now;
    }

    const plannedEnd = new Date(
      plannedStart.getTime() + durationMinutes * 60000
    );

    await addQuest({
      title: title.trim(),
      description: description.trim() || null,
      quest_type: questType,
      duration_minutes: durationMinutes,
      plannedStart,
      plannedEnd,
      base_xp: questType === "main" ? 20 : 10,
      attribute_ids: selectedAttributes,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setQuestType("side");
    setDurationMinutes(30);
    setCustomDuration("");
    setSelectedAttributes([]);
    setIsSubmitting(false);
    onClose();
  };

  const handleDurationChange = (value: number) => {
    setDurationMinutes(value);
    setCustomDuration("");
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setDurationMinutes(num);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50"
          >
            <div className="bg-card border border-hud-primary/30 rounded-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-hud text-lg text-hud-primary tracking-wider">
                  NEW QUEST
                </h2>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Quest Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                {/* Description (optional) */}
                <div>
                  <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Description{" "}
                    <span className="text-muted-foreground/50">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Quest Type */}
                <div>
                  <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Quest Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestType("main")}
                      className={`flex-1 py-3 rounded-lg border font-hud text-sm uppercase tracking-wider transition-all ${
                        questType === "main"
                          ? "bg-hud-warning/20 border-hud-warning text-hud-warning"
                          : "bg-card border-border text-muted-foreground hover:border-hud-warning/50"
                      }`}
                    >
                      Main
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestType("side")}
                      className={`flex-1 py-3 rounded-lg border font-hud text-sm uppercase tracking-wider transition-all ${
                        questType === "side"
                          ? "bg-hud-secondary/20 border-hud-secondary text-hud-secondary"
                          : "bg-card border-border text-muted-foreground hover:border-hud-secondary/50"
                      }`}
                    >
                      Side
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    {questType === "main"
                      ? "Main quests are protected from sacrifice and earn 2x XP"
                      : "Side quests may be sacrificed if time runs low"}
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Duration
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleDurationChange(preset.value)}
                        className={`py-2 rounded border text-sm transition-all ${
                          durationMinutes === preset.value && !customDuration
                            ? "bg-hud-primary/20 border-hud-primary text-hud-primary"
                            : "bg-card border-border text-muted-foreground hover:border-hud-primary/50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customDuration}
                      onChange={(e) => handleCustomDurationChange(e.target.value)}
                      placeholder="Custom"
                      min="1"
                      max="480"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all text-sm"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Attributes{" "}
                    <span className="text-muted-foreground/50">(select up to 2)</span>
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {ATTRIBUTES.map((attr) => {
                      const isSelected = selectedAttributes.includes(attr.id);
                      return (
                        <button
                          key={attr.id}
                          type="button"
                          onClick={() => toggleAttribute(attr.id)}
                          title={attr.name}
                          className={`py-2 rounded border text-lg transition-all ${
                            isSelected
                              ? "border-2"
                              : "bg-card border-border hover:border-muted-foreground/50"
                          }`}
                          style={
                            isSelected
                              ? { borderColor: attr.color, backgroundColor: `${attr.color}20` }
                              : undefined
                          }
                        >
                          {attr.icon}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAttributes.length > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {selectedAttributes
                        .map((id) => ATTRIBUTES.find((a) => a.id === id)?.name)
                        .join(" + ")}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-card border border-border text-muted-foreground font-hud uppercase tracking-wider rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || isSubmitting}
                    className="flex-1 py-3 bg-hud-primary/10 border border-hud-primary text-hud-primary font-hud uppercase tracking-wider rounded-lg hover:bg-hud-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Adding..." : "Add Quest"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
