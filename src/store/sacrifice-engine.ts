import type { LocalQuest, SacrificeResult } from "./types";
import type { DifficultyMode } from "@/types/database";
import { DIFFICULTY_CONFIG } from "./xp-calculator";

/**
 * The Sacrifice Algorithm
 *
 * When schedule overflows bedtime:
 * 1. Calculate total overflow
 * 2. Sacrifice side quests (lowest position first) until main quests fit
 * 3. If main quests STILL don't fit, return warning
 */
export function executeSacrifice(
  quests: LocalQuest[],
  bedtime: Date,
  now: Date = new Date()
): SacrificeResult {
  // Sort by position (queue order)
  const sorted = [...quests]
    .filter((q) => q.status === "pending" || q.status === "active")
    .sort((a, b) => a.position - b.position);

  // Separate main and side quests
  const mainQuests = sorted.filter((q) => q.quest_type === "main");
  const sideQuests = sorted.filter((q) => q.quest_type === "side");

  // Calculate time budget
  const minutesUntilBedtime = Math.max(
    0,
    (bedtime.getTime() - now.getTime()) / 60000
  );

  // Calculate required time for main quests only
  const mainQuestMinutes = mainQuests.reduce(
    (sum, q) => sum + q.duration_minutes,
    0
  );

  // Calculate total required time
  const totalMinutes = sorted.reduce((sum, q) => sum + q.duration_minutes, 0);

  // No overflow? No sacrifice needed
  if (totalMinutes <= minutesUntilBedtime) {
    return {
      updatedQuests: quests,
      sacrificedQuests: [],
      mainQuestsAtRisk: [],
    };
  }

  // CRITICAL: Check if main quests alone exceed budget
  if (mainQuestMinutes > minutesUntilBedtime) {
    // Even sacrificing ALL side quests won't help
    // Return warning but still sacrifice side quests
    const sacrificed = sideQuests.map((q) => ({
      ...q,
      status: "sacrificed" as const,
    }));

    // Find which main quests won't fit
    let runningTime = 0;
    const atRisk = mainQuests.filter((q) => {
      runningTime += q.duration_minutes;
      return runningTime > minutesUntilBedtime;
    });

    return {
      updatedQuests: quests.map(
        (q) => sacrificed.find((s) => s.id === q.id) || q
      ),
      sacrificedQuests: sacrificed,
      mainQuestsAtRisk: atRisk,
    };
  }

  // Calculate overflow amount
  const overflowMinutes = totalMinutes - minutesUntilBedtime;

  // Sacrifice side quests until we recover enough time
  // Strategy: Sacrifice from END of queue first (lowest priority)
  const sideQuestsByPriority = [...sideQuests].reverse();

  let recoveredMinutes = 0;
  const sacrificedQuests: LocalQuest[] = [];

  for (const quest of sideQuestsByPriority) {
    if (recoveredMinutes >= overflowMinutes) break;

    sacrificedQuests.push({
      ...quest,
      status: "sacrificed",
    });
    recoveredMinutes += quest.duration_minutes;
  }

  // Apply sacrifices to quest list
  const updatedQuests = quests.map((q) => {
    const sacrificed = sacrificedQuests.find((s) => s.id === q.id);
    return sacrificed || q;
  });

  return {
    updatedQuests,
    sacrificedQuests,
    mainQuestsAtRisk: [],
  };
}

/**
 * Recalculate schedule times after a change
 * Cascades times forward from a starting position
 */
export function recalculateScheduleTimes(
  quests: LocalQuest[],
  startFromPosition: number = 0,
  startTime: Date
): LocalQuest[] {
  // Sort by position
  const sorted = [...quests].sort((a, b) => a.position - b.position);

  let runningTime = startTime;

  return sorted.map((quest, index) => {
    // Skip completed/sacrificed quests before start position
    if (
      quest.position < startFromPosition ||
      quest.status === "completed" ||
      quest.status === "sacrificed"
    ) {
      return quest;
    }

    // For active quest, use actual start time if available
    if (quest.status === "active" && quest.actualStart) {
      const newEnd = new Date(
        quest.actualStart.getTime() + quest.duration_minutes * 60000
      );
      runningTime = newEnd;
      return {
        ...quest,
        plannedEnd: newEnd,
      };
    }

    // Update pending quest times
    const newStart = new Date(runningTime);
    const newEnd = new Date(runningTime.getTime() + quest.duration_minutes * 60000);
    runningTime = newEnd;

    return {
      ...quest,
      plannedStart: newStart,
      plannedEnd: newEnd,
    };
  });
}

/**
 * Calculate Darkness Level for Anti-Vision UI
 *
 * 0 = Perfect day, bright UI
 * 100 = Failed day, Anti-Vision bleeding through
 *
 * Difficulty affects when darkness kicks in:
 * - Story: Never (always 0)
 * - Normal: At 30%+ failure rate
 * - Hardcore: At 10%+ failure rate (bleeds faster)
 */
export function calculateDarknessLevel(
  completedQuests: LocalQuest[],
  sacrificedQuests: LocalQuest[],
  failedMainQuests: LocalQuest[],
  difficulty: DifficultyMode = "normal"
): number {
  const config = DIFFICULTY_CONFIG[difficulty];

  // Story mode: darkness disabled
  if (config.darknessThreshold >= 100) {
    return 0;
  }

  // Calculate failure rate (0-100)
  const totalQuests = completedQuests.length + sacrificedQuests.length + failedMainQuests.length;
  if (totalQuests === 0) {
    return 0;
  }

  const failedCount = sacrificedQuests.length + failedMainQuests.length;
  const failureRate = (failedCount / totalQuests) * 100;

  // Don't show darkness until we hit the threshold
  if (failureRate < config.darknessThreshold) {
    return 0;
  }

  // Calculate base darkness from failures
  let darkness = 0;

  // Each sacrificed quest adds darkness
  darkness += sacrificedQuests.length * 5;

  // Each failed main quest adds significant darkness
  darkness += failedMainQuests.length * 25;

  // Low accuracy adds darkness
  const accuracies = completedQuests
    .filter((q) => q.accuracy !== null)
    .map((q) => q.accuracy!);

  if (accuracies.length > 0) {
    const avgAccuracy =
      accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;

    if (avgAccuracy < 50) darkness += 30;
    else if (avgAccuracy < 70) darkness += 15;
    else if (avgAccuracy < 85) darkness += 5;
  }

  // Hardcore mode: darkness bleeds faster (1.5x intensity)
  if (difficulty === "hardcore") {
    darkness = Math.round(darkness * 1.5);
  }

  return Math.min(100, darkness);
}

/**
 * Calculate free time remaining
 */
export function calculateFreeTime(
  quests: LocalQuest[],
  bedtime: Date,
  now: Date = new Date()
): number {
  // Sum of remaining task durations (pending + active)
  const remainingTaskMinutes = quests
    .filter((q) => q.status === "pending" || q.status === "active")
    .reduce((sum, q) => sum + q.duration_minutes, 0);

  // Minutes until bedtime
  const minutesUntilBedtime = Math.max(
    0,
    (bedtime.getTime() - now.getTime()) / 60000
  );

  // Free time = available time - committed time
  return Math.max(0, Math.round(minutesUntilBedtime - remainingTaskMinutes));
}
