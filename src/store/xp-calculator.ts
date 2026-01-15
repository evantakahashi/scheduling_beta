import type { LocalQuest, XPResult } from "./types";

/**
 * XP Calculation based on Schedule Accuracy
 *
 * Perfect accuracy (actual = planned) = 100% of base XP
 * Over time penalty: -50% per 100% overtime
 * Under time bonus: +50% per 100% under (capped at 120%)
 *
 * Main quests = 2x XP multiplier
 */
export function calculateQuestXP(quest: LocalQuest): XPResult {
  if (!quest.actualStart || !quest.actualEnd) {
    return { earnedXp: 0, accuracy: 0, multiplier: 0 };
  }

  const plannedMs = quest.duration_minutes * 60000;
  const actualMs = quest.actualEnd.getTime() - quest.actualStart.getTime();

  // Accuracy ratio: 1.0 = perfect, >1 = overtime, <1 = under
  const ratio = actualMs / plannedMs;

  // Calculate accuracy percentage (100% = perfect)
  // If ratio is 1.0, accuracy is 100%
  // If ratio is 2.0 (2x overtime), accuracy is 50%
  // If ratio is 0.5 (finished in half time), accuracy is capped at 120%
  const accuracy = ratio <= 1 ? Math.min(120, (1 / ratio) * 100) : (1 / ratio) * 100;

  let multiplier: number;

  if (ratio <= 1) {
    // Finished early or on time: bonus (capped at 1.2x)
    multiplier = Math.min(1.2, 1 + (1 - ratio) * 0.5);
  } else {
    // Finished late: penalty
    // 2x time = 0.5 multiplier, 3x time = 0 multiplier
    multiplier = Math.max(0, 1 - (ratio - 1) * 0.5);
  }

  // Main quests worth 2x
  const typeMultiplier = quest.quest_type === "main" ? 2 : 1;

  const earnedXp = Math.round(quest.base_xp * multiplier * typeMultiplier);

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
