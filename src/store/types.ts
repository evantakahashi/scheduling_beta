import type { Quest, Day, Boss, Profile, AttributeId, UserAttribute, ClassId, BossReward } from "@/types/database";

// Local state versions with Date objects instead of strings
export interface LocalQuest extends Omit<Quest, "planned_start" | "planned_end" | "actual_start" | "actual_end" | "created_at" | "updated_at"> {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  attribute_ids: AttributeId[]; // Linked attributes (max 2)
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
  userAttributes: UserAttribute[];

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

  // Hardcore mode
  isGameOver: boolean;

  // Loot system
  droppedLoot: BossReward | null;
  defeatedBossTitle: string | null;
}

// Input type for adding a new quest (only user-provided fields)
export interface AddQuestInput {
  title: string;
  description: string | null;
  quest_type: "main" | "side";
  duration_minutes: number;
  plannedStart: Date;
  plannedEnd: Date;
  base_xp: number;
  boss_id?: string | null;
  attribute_ids?: AttributeId[];
  is_endurance?: boolean;
}

export interface GameActions {
  // Data loading
  loadProfile: () => Promise<void>;
  loadDay: (date: string) => Promise<void>;
  loadActiveBoss: () => Promise<void>;
  loadUserAttributes: () => Promise<void>;

  // Quest actions
  addQuest: (quest: AddQuestInput) => Promise<void>;
  updateQuest: (questId: string, updates: Partial<LocalQuest>) => void;
  deleteQuest: (questId: string) => Promise<void>;
  reorderQuests: (activeId: string, overId: string) => void;

  // Core game actions
  startQuest: (questId: string) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  skipQuest: (questId: string) => Promise<void>;

  // Engine functions
  recalculateSchedule: () => void;
  executeSacrifice: () => SacrificeResult;

  // Profile actions
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeOnboarding: (vision: string, antiVision: string, mission: string, classId?: ClassId) => Promise<void>;

  // Hardcore mode
  dismissGameOver: () => Promise<void>;

  // Loot system
  claimLoot: () => Promise<void>;
  dismissLoot: () => void;

  // Boss defeat
  defeatBoss: (bossId: string, proofImageUrl: string) => Promise<void>;
}

export type GameStore = GameState & GameActions;
