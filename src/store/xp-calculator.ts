import type { LocalQuest, XPResult } from "./types";
import type { DifficultyMode } from "@/types/database";

/**
 * Difficulty Configuration
 * Each mode has different XP multipliers and penalty settings
 */
export interface DifficultyConfig {
  xpMultiplier: number;
  streakThreshold: number;      // % completion needed for streak (0 = always)
  darknessThreshold: number;    // % failure before darkness kicks in (100 = never)
  penalizeOvertime: boolean;
  mainQuestStreak: boolean;     // Streak requires ALL main quests completed
}

export const DIFFICULTY_CONFIG: Record<DifficultyMode, DifficultyConfig> = {
  story: {
    xpMultiplier: 1.0,
    streakThreshold: 0,         // Always maintain streak
    darknessThreshold: 100,     // Never show darkness
    penalizeOvertime: false,
    mainQuestStreak: false,
  },
  normal: {
    xpMultiplier: 1.0,
    streakThreshold: 80,        // 80% daily completion for streak
    darknessThreshold: 30,      // Darkness at 30%+ failure
    penalizeOvertime: true,
    mainQuestStreak: false,
  },
  hardcore: {
    xpMultiplier: 1.5,
    streakThreshold: 100,       // 100% completion required
    darknessThreshold: 10,      // Darkness at 10%+ failure
    penalizeOvertime: true,
    mainQuestStreak: true,      // ANY main quest fail = streak reset
  },
};

/**
 * XP Calculation based on Schedule Accuracy
 *
 * Perfect accuracy (actual = planned) = 100% of base XP
 * Over time penalty: -50% per 100% overtime (if difficulty allows)
 * Under time bonus: +50% per 100% under (capped at 120%)
 *
 * Main quests = 2x XP multiplier
 * Difficulty multiplier applied on top
 */
export function calculateQuestXP(
  quest: LocalQuest,
  difficulty: DifficultyMode = "normal"
): XPResult {
  if (!quest.actualStart || !quest.actualEnd) {
    return { earnedXp: 0, accuracy: 0, multiplier: 0 };
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  const plannedMs = quest.duration_minutes * 60000;
  const actualMs = quest.actualEnd.getTime() - quest.actualStart.getTime();

  // Accuracy ratio: 1.0 = perfect, >1 = overtime, <1 = under
  const ratio = actualMs / plannedMs;

  // Calculate accuracy percentage (100% = perfect)
  const accuracy = ratio <= 1 ? Math.min(120, (1 / ratio) * 100) : (1 / ratio) * 100;

  let multiplier: number;

  if (ratio <= 1) {
    // Finished early or on time: bonus (capped at 1.2x)
    multiplier = Math.min(1.2, 1 + (1 - ratio) * 0.5);
  } else {
    // Finished late: penalty (only if difficulty allows)
    if (config.penalizeOvertime) {
      // 2x time = 0.5 multiplier, 3x time = 0 multiplier
      multiplier = Math.max(0, 1 - (ratio - 1) * 0.5);
    } else {
      // Story mode: no penalty, just cap at 1.0
      multiplier = 1.0;
    }
  }

  // Main quests worth 2x
  const typeMultiplier = quest.quest_type === "main" ? 2 : 1;

  // Apply difficulty XP multiplier
  const earnedXp = Math.round(quest.base_xp * multiplier * typeMultiplier * config.xpMultiplier);

  return {
    earnedXp,
    accuracy: Math.round(accuracy * 100) / 100,
    multiplier: Math.round(multiplier * 100) / 100,
  };
}

/**
 * Calculate boss damage for a completed quest
 * Only main quests linked to a boss deal damage
 * Damage is based on duration and accuracy
 */
export function calculateBossDamage(quest: LocalQuest, accuracy: number): number {
  if (quest.quest_type !== "main" || !quest.boss_id) {
    return 0;
  }

  // Base damage is proportional to quest duration
  // 60 min quest = 10 base damage
  const baseDamage = Math.round(quest.duration_minutes / 6);

  // Scale by accuracy (100% accuracy = full damage)
  const accuracyMultiplier = Math.min(1, accuracy / 100);

  return Math.round(baseDamage * accuracyMultiplier);
}

/**
 * Calculate level from total XP
 * Each level requires progressively more XP
 */
export function calculateLevel(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
  // XP required per level: 100, 200, 300, 400, ...
  // Total XP for level N: N * (N + 1) * 50
  let level = 1;
  let xpForNextLevel = 100;
  let totalXpForLevel = 0;

  while (totalXp >= totalXpForLevel + xpForNextLevel) {
    totalXpForLevel += xpForNextLevel;
    level++;
    xpForNextLevel = level * 100;
  }

  return {
    level,
    currentXp: totalXp - totalXpForLevel,
    nextLevelXp: xpForNextLevel,
  };
}

/**
 * Check if streak should be maintained based on difficulty
 */
export function shouldMaintainStreak(
  completedQuests: LocalQuest[],
  totalQuests: LocalQuest[],
  difficulty: DifficultyMode
): boolean {
  const config = DIFFICULTY_CONFIG[difficulty];

  // Story mode: always maintain streak
  if (config.streakThreshold === 0) {
    return true;
  }

  // Filter to only count main + side (not sacrificed/failed)
  const countableQuests = totalQuests.filter(
    (q) => q.status !== "sacrificed" && q.status !== "failed"
  );

  if (countableQuests.length === 0) {
    return true; // No quests = streak maintained
  }

  // Hardcore mode: check main quests specifically
  if (config.mainQuestStreak) {
    const mainQuests = totalQuests.filter((q) => q.quest_type === "main");
    const completedMain = completedQuests.filter((q) => q.quest_type === "main");

    // Any main quest not completed = streak broken
    if (mainQuests.length > 0 && completedMain.length < mainQuests.length) {
      return false;
    }
  }

  // Check completion percentage
  const completionRate = (completedQuests.length / countableQuests.length) * 100;
  return completionRate >= config.streakThreshold;
}

/**
 * Check if game over should trigger (Hardcore mode only)
 */
export function shouldTriggerGameOver(
  quests: LocalQuest[],
  difficulty: DifficultyMode
): boolean {
  if (difficulty !== "hardcore") {
    return false;
  }

  // In hardcore mode, any failed or sacrificed main quest = game over
  const failedMainQuests = quests.filter(
    (q) => q.quest_type === "main" && (q.status === "failed" || q.status === "sacrificed")
  );

  return failedMainQuests.length > 0;
}
