import type { Quest, Day, Boss, Profile } from "@/types/database";

// Local state versions with Date objects instead of strings
export interface LocalQuest extends Omit<Quest, "planned_start" | "planned_end" | "actual_start" | "actual_end" | "created_at" | "updated_at"> {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
}

export interface LocalDay extends Omit<Day, "created_at" | "updated_at"> {
  bedtimeDate: Date; // Computed from date + bedtime
  wakeTimeDate: Date; // Computed from date + wake_time
}

export interface SacrificeResult {
  updatedQuests: LocalQuest[];
  sacrificedQuests: LocalQuest[];
  mainQuestsAtRisk: LocalQuest[];
}

export interface XPResult {
  earnedXp: number;
  accuracy: number;
  multiplier: number;
}

export interface GameState {
  // User data
  profile: Profile | null;
  isOnboarded: boolean;

  // Current day data
  currentDay: LocalDay | null;
  quests: LocalQuest[];
  activeBoss: Boss | null;

  // Computed values
  freeTimeMinutes: number;
  darknessLevel: number;

  // UI state
  isLoading: boolean;
  isSyncing: boolean;
  recentSacrifices: LocalQuest[];
  recentDamage: number;
}

export interface GameActions {
  // Data loading
  loadProfile: () => Promise<void>;
  loadDay: (date: string) => Promise<void>;
  loadActiveBoss: () => Promise<void>;

  // Quest actions
  addQuest: (quest: Omit<LocalQuest, "id" | "position" | "status" | "earnedXp" | "accuracy" | "bossDamage">) => Promise<void>;
  updateQuest: (questId: string, updates: Partial<LocalQuest>) => void;
  deleteQuest: (questId: string) => void;
  reorderQuests: (activeId: string, overId: string) => void;

  // Core game actions
  startQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  skipQuest: (questId: string) => void;

  // Engine functions
  recalculateSchedule: () => void;
  executeSacrifice: () => SacrificeResult;

  // Profile actions
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeOnboarding: (vision: string, antiVision: string, mission: string) => Promise<void>;
}

export type GameStore = GameState & GameActions;
